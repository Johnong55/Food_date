import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import type { LookupFunction } from "node:net";

import {
  type HostResolver,
  validateAndResolveUrl,
} from "@/services/menu-resolver/safe-fetch/safe-url";

export const MENU_CRAWLER_USER_AGENT = "DiDauAnGiMenuResolver/0.1";

type FetchOptions = {
  officialHostname: string;
  allowedContentTypes: string[];
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  allowMissingContentType?: boolean;
};

export type SafeFetchResponse = {
  url: URL;
  status: number;
  contentType?: string;
  body: string;
};

export class SafeFetchError extends Error {
  constructor(
    readonly code:
      | "timeout"
      | "response_too_large"
      | "unsupported_content_type"
      | "compressed_response"
      | "invalid_redirect"
      | "network_error",
  ) {
    super(code);
    this.name = "SafeFetchError";
  }
}

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maximum: number) {}

  acquire() {
    return new Promise<() => void>((resolve) => {
      const grant = () => {
        this.active += 1;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.active -= 1;
          this.queue.shift()?.();
        });
      };

      if (this.active < this.maximum) grant();
      else this.queue.push(grant);
    });
  }
}

type OriginSemaphoreEntry = {
  semaphore: Semaphore;
  users: number;
};

const globalCrawlerState = globalThis as typeof globalThis & {
  ddagCrawlerSemaphore?: Semaphore;
  ddagOriginSemaphores?: Map<string, OriginSemaphoreEntry>;
};

function crawlerSemaphore() {
  globalCrawlerState.ddagCrawlerSemaphore ??= new Semaphore(4);
  return globalCrawlerState.ddagCrawlerSemaphore;
}

async function acquireOrigin(origin: string) {
  globalCrawlerState.ddagOriginSemaphores ??= new Map();
  const entry = globalCrawlerState.ddagOriginSemaphores.get(origin) ?? {
    semaphore: new Semaphore(1),
    users: 0,
  };
  globalCrawlerState.ddagOriginSemaphores.set(origin, entry);
  entry.users += 1;
  const releaseSemaphore = await entry.semaphore.acquire();

  return () => {
    releaseSemaphore();
    entry.users -= 1;
    if (entry.users === 0) globalCrawlerState.ddagOriginSemaphores?.delete(origin);
  };
}

export class SafeHttpFetcher {
  constructor(private readonly resolver?: HostResolver) {}

  async fetch(input: string | URL, options: FetchOptions): Promise<SafeFetchResponse> {
    const initial = new URL(input);
    const releaseOrigin = await acquireOrigin(initial.origin);
    const releaseGlobal = await crawlerSemaphore().acquire();
    try {
      return await this.fetchRedirects(initial, options, 0);
    } finally {
      releaseGlobal();
      releaseOrigin();
    }
  }

  private async fetchRedirects(
    input: URL,
    options: FetchOptions,
    redirectCount: number,
  ): Promise<SafeFetchResponse> {
    const { url, address } = await validateAndResolveUrl(input, {
      officialHostname: options.officialHostname,
      resolver: this.resolver,
    });
    const response = await this.requestOnce(url, address, options);

    if (response.status >= 300 && response.status < 400) {
      if (redirectCount >= (options.maxRedirects ?? 3) || !response.location) {
        throw new SafeFetchError("invalid_redirect");
      }
      return this.fetchRedirects(
        new URL(response.location, url),
        options,
        redirectCount + 1,
      );
    }

    return {
      url,
      status: response.status,
      contentType: response.contentType,
      body: response.body,
    };
  }

  private requestOnce(
    url: URL,
    address: { address: string; family: 4 | 6 },
    options: FetchOptions,
  ) {
    return new Promise<{
      status: number;
      contentType?: string;
      location?: string;
      body: string;
    }>((resolve, reject) => {
      const lookup: LookupFunction = (_hostname, _lookupOptions, callback) => {
        callback(null, address.address, address.family);
      };
      const request = (url.protocol === "https:" ? requestHttps : requestHttp)(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || undefined,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          agent: false,
          lookup,
          maxHeaderSize: 16 * 1024,
          headers: {
            Accept: options.allowedContentTypes.join(", "),
            "Accept-Encoding": "identity",
            "User-Agent": MENU_CRAWLER_USER_AGENT,
          },
        },
        (response) => {
          const status = response.statusCode ?? 502;
          const location = response.headers.location;
          const contentEncoding = response.headers["content-encoding"];
          const rawContentType = response.headers["content-type"];
          const contentType = rawContentType?.split(";", 1)[0]?.trim().toLowerCase();

          if (contentEncoding && contentEncoding !== "identity") {
            response.resume();
            reject(new SafeFetchError("compressed_response"));
            return;
          }
          if (
            !(status >= 300 && status < 400) &&
            (!contentType
              ? !options.allowMissingContentType
              : !options.allowedContentTypes.includes(contentType))
          ) {
            response.resume();
            reject(new SafeFetchError("unsupported_content_type"));
            return;
          }

          const chunks: Buffer[] = [];
          let receivedBytes = 0;
          response.on("data", (chunk: Buffer) => {
            receivedBytes += chunk.byteLength;
            if (receivedBytes > options.maxBytes) {
              request.destroy(new SafeFetchError("response_too_large"));
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            resolve({
              status,
              contentType,
              location,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
        },
      );

      request.setTimeout(options.timeoutMs ?? 4_000, () => {
        request.destroy(new SafeFetchError("timeout"));
      });
      request.on("error", (error) => {
        reject(error instanceof SafeFetchError ? error : new SafeFetchError("network_error"));
      });
      request.end();
    });
  }
}
