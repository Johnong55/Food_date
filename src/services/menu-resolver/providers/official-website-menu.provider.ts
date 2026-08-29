import {
  discoverMenuLinks,
  parseOfficialMenuHtml,
} from "@/services/menu-resolver/parsers/menu-parser";
import type {
  MenuProvider,
  MenuProviderResult,
  MenuResolveContext,
} from "@/services/menu-resolver/menu-provider";
import {
  SafeFetchError,
  SafeHttpFetcher,
  type SafeFetchResponse,
} from "@/services/menu-resolver/safe-fetch/safe-http-fetcher";
import {
  loadRobotsPolicy,
  RobotsPolicyError,
} from "@/services/menu-resolver/safe-fetch/robots-policy";
import { SafeUrlError, sameOfficialHost } from "@/services/menu-resolver/safe-fetch/safe-url";

type OfficialFetcher = {
  fetch(
    input: string | URL,
    options: {
      officialHostname: string;
      allowedContentTypes: string[];
      maxBytes: number;
      timeoutMs?: number;
      maxRedirects?: number;
      allowMissingContentType?: boolean;
    },
  ): Promise<SafeFetchResponse>;
};

const KNOWN_MENU_PATHS = [
  "/menu",
  "/menu.html",
  "/thuc-don",
  "/food",
  "/products",
  "/order",
] as const;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function uniqueOfficialCandidates(urls: string[], officialHostname: string) {
  const seen = new Set<string>();
  return urls.flatMap((candidate) => {
    try {
      const url = new URL(candidate);
      url.hash = "";
      if (!sameOfficialHost(url.hostname, officialHostname)) return [];
      const normalized = url.toString();
      if (seen.has(normalized)) return [];
      seen.add(normalized);
      return [url];
    } catch {
      return [];
    }
  });
}

export class OfficialWebsiteMenuProvider implements MenuProvider {
  readonly id = "official_website";

  constructor(
    private readonly fetcher: OfficialFetcher = new SafeHttpFetcher(),
    private readonly now: () => Date = () => new Date(),
    private readonly delay: (milliseconds: number) => Promise<void> = wait,
  ) {}

  async resolve(context: MenuResolveContext): Promise<MenuProviderResult> {
    if (!context.officialWebsiteUri) {
      return { status: "miss", reason: "official_website_missing" };
    }

    let officialWebsite: URL;
    try {
      officialWebsite = new URL(context.officialWebsiteUri);
    } catch {
      return { status: "blocked", reason: "invalid_official_website" };
    }

    try {
      const robots = await loadRobotsPolicy(this.fetcher, officialWebsite);
      const initialCandidates = uniqueOfficialCandidates(
        [
          officialWebsite.toString(),
          ...KNOWN_MENU_PATHS.map((path) => new URL(path, officialWebsite).toString()),
        ],
        officialWebsite.hostname,
      );
      const queue = [...initialCandidates];
      const visited = new Set<string>();
      let fetchedPages = 0;

      while (queue.length > 0 && fetchedPages < 3) {
        const candidate = queue.shift();
        if (!candidate || visited.has(candidate.toString())) continue;
        visited.add(candidate.toString());
        if (!robots.isAllowed(candidate)) continue;

        if (fetchedPages > 0) await this.delay(robots.crawlDelayMs);
        const response = await this.fetcher.fetch(candidate, {
          officialHostname: officialWebsite.hostname,
          allowedContentTypes: ["text/html", "application/xhtml+xml"],
          maxBytes: 1_500_000,
          timeoutMs: 4_000,
          maxRedirects: 3,
        });
        fetchedPages += 1;
        if (response.status < 200 || response.status >= 300) continue;

        const parsed = parseOfficialMenuHtml(response.body, response.url);
        if (parsed?.sections.length) {
          return {
            status: "resolved",
            menu: {
              restaurantId: context.restaurantId,
              sourceType: "official_website",
              sourceUrl: response.url.toString(),
              verified: false,
              lastUpdated: this.now().toISOString(),
              confidence: parsed.parser === "json_ld" ? "high" : "medium",
              sections: parsed.sections,
            },
          };
        }

        const discovered = uniqueOfficialCandidates(
          [
            ...(parsed?.linkedMenuUrls ?? []),
            ...discoverMenuLinks(response.body, response.url),
          ],
          officialWebsite.hostname,
        );
        for (const url of discovered) {
          if (!visited.has(url.toString())) queue.unshift(url);
        }
      }

      return {
        status: "miss",
        reason: fetchedPages === 0 ? "robots_disallowed" : "menu_not_found",
      };
    } catch (error) {
      if (error instanceof RobotsPolicyError) {
        return { status: "blocked", reason: error.code };
      }
      if (error instanceof SafeUrlError) {
        return { status: "blocked", reason: error.code };
      }
      if (error instanceof SafeFetchError) {
        return { status: "failed", reason: error.code };
      }
      return { status: "failed", reason: "website_fetch_failed" };
    }
  }
}
