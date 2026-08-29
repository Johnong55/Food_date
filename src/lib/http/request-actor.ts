import { createHash } from "node:crypto";

function getForwardedIp(headers: Headers) {
  const candidate =
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";

  return candidate.length <= 64 && /^[0-9a-fA-F:.]+$/.test(candidate)
    ? candidate
    : "unknown";
}

export function getHashedRequestActor(headers: Headers) {
  return createHash("sha256")
    .update(`search:${getForwardedIp(headers)}`)
    .digest("hex")
    .slice(0, 32);
}
