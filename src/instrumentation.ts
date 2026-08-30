import type { Instrumentation } from "next";

function safePath(path: string) {
  return path.split("?", 1)[0];
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const normalizedError =
    error instanceof Error ? error : new Error("Unknown server request error");
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;
  const record = {
    level: "error",
    event: "next_request_error",
    message: normalizedError.message,
    digest,
    method: request.method,
    path: safePath(request.path),
    route: context.routePath,
    routeType: context.routeType,
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    deployment: process.env.VERCEL_ENV ?? "local",
    timestamp: new Date().toISOString(),
  };

  // Vercel captures stderr as structured Function logs. Do not add request
  // headers, cookies, query strings or user input to this record.
  console.error(JSON.stringify(record));
};
