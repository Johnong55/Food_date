import { describe, expect, it } from "vitest";

import {
  isPublicIpAddress,
  sameOfficialHost,
  validateAndResolveUrl,
} from "@/services/menu-resolver/safe-fetch/safe-url";

describe("menu crawler safe URL validation", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.10",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it("allows only public DNS results and pins one validated address", async () => {
    const result = await validateAndResolveUrl("https://restaurant.example/menu", {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }],
    });
    expect(result.address.address).toBe("93.184.216.34");

    await expect(
      validateAndResolveUrl("https://restaurant.example/menu", {
        resolver: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
      }),
    ).rejects.toMatchObject({ code: "blocked_ip" });
  });

  it("blocks credentials, non-standard ports, metadata and unrelated redirects", async () => {
    const resolver = async () => [{ address: "93.184.216.34", family: 4 as const }];
    await expect(
      validateAndResolveUrl("https://user:pass@restaurant.example/menu", { resolver }),
    ).rejects.toMatchObject({ code: "blocked_credentials" });
    await expect(
      validateAndResolveUrl("https://restaurant.example:8443/menu", { resolver }),
    ).rejects.toMatchObject({ code: "blocked_port" });
    await expect(
      validateAndResolveUrl("http://metadata.google.internal/latest", { resolver }),
    ).rejects.toMatchObject({ code: "blocked_hostname" });
    await expect(
      validateAndResolveUrl("https://evil.example/menu", {
        resolver,
        officialHostname: "restaurant.example",
      }),
    ).rejects.toMatchObject({ code: "cross_origin_redirect" });
    expect(sameOfficialHost("www.restaurant.example", "restaurant.example")).toBe(true);
  });
});
