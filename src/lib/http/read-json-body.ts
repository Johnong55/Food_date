import type { NextRequest } from "next/server";

export class JsonBodyError extends Error {
  constructor(
    readonly code:
      | "UNSUPPORTED_MEDIA_TYPE"
      | "PAYLOAD_TOO_LARGE"
      | "INVALID_JSON",
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "JsonBodyError";
  }
}

export async function readJsonBody(
  request: NextRequest,
  options: { maxBytes: number; payloadMessage: string },
): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new JsonBodyError(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Request phải sử dụng application/json.",
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    throw new JsonBodyError(
      "PAYLOAD_TOO_LARGE",
      413,
      options.payloadMessage,
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > options.maxBytes) {
    throw new JsonBodyError(
      "PAYLOAD_TOO_LARGE",
      413,
      options.payloadMessage,
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new JsonBodyError("INVALID_JSON", 400, "JSON không hợp lệ.");
  }
}
