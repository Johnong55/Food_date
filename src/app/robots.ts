import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env/server";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore", "/restaurant/", "/menu/"],
      disallow: [
        "/api/",
        "/auth/",
        "/couple/",
        "/history",
        "/join/",
        "/matches",
        "/profile",
        "/saved",
      ],
    },
    host: new URL(getSiteUrl()).origin,
  };
}
