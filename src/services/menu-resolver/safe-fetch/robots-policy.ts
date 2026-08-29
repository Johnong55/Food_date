import robotsParser from "robots-parser";

import {
  MENU_CRAWLER_USER_AGENT,
  type SafeFetchResponse,
} from "@/services/menu-resolver/safe-fetch/safe-http-fetcher";

type RobotsFetcher = {
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

export type RobotsPolicy = {
  isAllowed(url: string | URL): boolean;
  crawlDelayMs: number;
};

export class RobotsPolicyError extends Error {
  constructor(readonly code: "robots_unavailable" | "crawl_delay_too_high") {
    super(code);
    this.name = "RobotsPolicyError";
  }
}

export async function loadRobotsPolicy(
  fetcher: RobotsFetcher,
  officialWebsite: URL,
): Promise<RobotsPolicy> {
  const robotsUrl = new URL("/robots.txt", officialWebsite);
  let response: SafeFetchResponse;
  try {
    response = await fetcher.fetch(robotsUrl, {
      officialHostname: officialWebsite.hostname,
      allowedContentTypes: ["text/plain", "text/html"],
      maxBytes: 500 * 1024,
      timeoutMs: 4_000,
      maxRedirects: 2,
      allowMissingContentType: true,
    });
  } catch {
    throw new RobotsPolicyError("robots_unavailable");
  }

  if (response.status === 404 || response.status === 410) {
    return { isAllowed: () => true, crawlDelayMs: 250 };
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 429 ||
    response.status >= 500
  ) {
    throw new RobotsPolicyError("robots_unavailable");
  }
  if (response.status >= 400) {
    return { isAllowed: () => true, crawlDelayMs: 250 };
  }

  const robots = robotsParser(robotsUrl.toString(), response.body);
  const crawlDelaySeconds = robots.getCrawlDelay(MENU_CRAWLER_USER_AGENT) ?? 0;
  if (crawlDelaySeconds > 2) {
    throw new RobotsPolicyError("crawl_delay_too_high");
  }

  return {
    isAllowed: (url) =>
      robots.isAllowed(new URL(url).toString(), MENU_CRAWLER_USER_AGENT) !== false,
    crawlDelayMs: Math.max(250, Math.ceil(crawlDelaySeconds * 1_000)),
  };
}
