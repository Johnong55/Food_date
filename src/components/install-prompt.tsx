"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_AT_KEY = "ddag-install-dismissed-at";
const VISIT_COUNT_KEY = "ddag-visit-count";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}

function mayOfferInstall() {
  const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY) ?? 0);
  return !dismissedAt || Date.now() - dismissedAt > DISMISS_FOR_MS;
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const visitCount = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount));

    const iosHelpTimer = window.setTimeout(() => {
      if (visitCount >= 2 && mayOfferInstall() && isIosSafari()) {
        setShowIosHelp(true);
      }
    }, 0);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (visitCount >= 2 && mayOfferInstall()) {
        setInstallEvent(event as BeforeInstallPromptEvent);
      }
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(iosHelpTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (pathname.startsWith("/explore") || (!installEvent && !showIosHelp)) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setInstallEvent(null);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <aside className="fixed inset-x-3 bottom-22 z-50 mx-auto max-w-md rounded-3xl border border-primary/15 bg-card p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {showIosHelp ? <Share /> : <Download />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Cài Đi Đâu Ăn Gì?</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {showIosHelp
              ? "Nhấn Share, rồi chọn Add to Home Screen."
              : "Mở nhanh như một ứng dụng ngay từ màn hình chính."}
          </p>
          {!showIosHelp && (
            <Button className="mt-3" size="sm" onClick={install}>
              Cài ứng dụng
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2"
          onClick={dismiss}
          aria-label="Đóng gợi ý cài đặt"
        >
          <X />
        </Button>
      </div>
    </aside>
  );
}
