import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import ipaddr from "ipaddr.js";

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

export class SafeUrlError extends Error {
  constructor(
    readonly code:
      | "invalid_url"
      | "blocked_scheme"
      | "blocked_credentials"
      | "blocked_port"
      | "blocked_hostname"
      | "blocked_ip"
      | "dns_failed"
      | "cross_origin_redirect",
  ) {
    super(code);
    this.name = "SafeUrlError";
  }
}

export const defaultHostResolver: HostResolver = async (hostname) => {
  try {
    const results = await lookup(hostname, { all: true, verbatim: true });
    return results.flatMap((result) =>
      result.family === 4 || result.family === 6
        ? [{ address: result.address, family: result.family }]
        : [],
    );
  } catch {
    throw new SafeUrlError("dns_failed");
  }
};

export function isPublicIpAddress(address: string) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export function sameOfficialHost(left: string, right: string) {
  const normalize = (hostname: string) =>
    hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  return normalize(left) === normalize(right);
}

function parseTarget(input: string | URL) {
  let url: URL;
  try {
    url = input instanceof URL ? new URL(input) : new URL(input);
  } catch {
    throw new SafeUrlError("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafeUrlError("blocked_scheme");
  }
  if (url.username || url.password) throw new SafeUrlError("blocked_credentials");
  if (
    url.port &&
    !(
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    )
  ) {
    throw new SafeUrlError("blocked_port");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLocaleLowerCase("en-US");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new SafeUrlError("blocked_hostname");
  }

  url.hash = "";
  return { url, hostname };
}

export async function validateAndResolveUrl(
  input: string | URL,
  options: {
    officialHostname?: string;
    resolver?: HostResolver;
  } = {},
) {
  const { url, hostname } = parseTarget(input);
  if (
    options.officialHostname &&
    !sameOfficialHost(hostname, options.officialHostname)
  ) {
    throw new SafeUrlError("cross_origin_redirect");
  }

  const literalFamily = isIP(hostname);
  const addresses: ResolvedAddress[] = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await (options.resolver ?? defaultHostResolver)(hostname);

  if (addresses.length === 0) throw new SafeUrlError("dns_failed");
  if (addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new SafeUrlError("blocked_ip");
  }

  return { url, address: addresses[0] as ResolvedAddress };
}
