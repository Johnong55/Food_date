import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Đi Đâu Ăn Gì?",
    short_name: "Đi Ăn",
    description:
      "Giúp bạn và người thương chọn nơi ăn uống và đi chơi nhanh hơn.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf5",
    theme_color: "#fffaf5",
    orientation: "portrait-primary",
    lang: "vi",
    categories: ["food", "lifestyle", "travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
