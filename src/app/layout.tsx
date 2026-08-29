import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Đi Đâu Ăn Gì?",
    template: "%s · Đi Đâu Ăn Gì?",
  },
  description:
    "Giúp bạn và người thương chọn nơi ăn uống và đi chơi nhanh hơn.",
  applicationName: "Đi Đâu Ăn Gì?",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Đi Ăn",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf5",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body style={{ "--font-app": '"Be Vietnam Pro"' } as React.CSSProperties}>
        <div className="mx-auto min-h-svh max-w-lg pb-24">{children}</div>
        <BottomNavigation />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
