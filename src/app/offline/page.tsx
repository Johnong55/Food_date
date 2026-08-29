import { WifiOff } from "lucide-react";

import { AppLogo } from "@/components/app-logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[calc(100svh-6rem)] flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <AppLogo compact />
      <section className="my-auto pb-24 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-secondary text-primary">
          <WifiOff className="size-9" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Bạn đang offline.</h1>
        <p className="mx-auto mt-3 max-w-xs leading-6 text-muted-foreground">
          Kết nối lại mạng để tìm địa điểm mới. Dữ liệu Google Places không được lưu vào bộ nhớ offline.
        </p>
      </section>
    </main>
  );
}
