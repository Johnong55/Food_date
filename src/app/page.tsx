import { ArrowRight, HeartHandshake, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const intents = [
  { emoji: "🍜", label: "Ăn gì?", href: "/explore?intent=food", tone: "bg-orange-100" },
  { emoji: "☕", label: "Uống gì?", href: "/explore?intent=drink", tone: "bg-amber-100" },
  { emoji: "❤️", label: "Đi date", href: "/explore?intent=date", tone: "bg-rose-100" },
  { emoji: "🎮", label: "Chơi gì?", href: "/explore?intent=play", tone: "bg-violet-100" },
  { emoji: "🎬", label: "Xem gì?", href: "/explore?intent=movie", tone: "bg-sky-100" },
  { emoji: "🌳", label: "Đi đâu?", href: "/explore?intent=place", tone: "bg-emerald-100" },
] as const;

export default function HomePage() {
  return (
    <main className="px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <AppLogo />
        <Button variant="outline" size="sm" asChild>
          <Link href="/explore">
            <MapPin aria-hidden="true" />
            TP.HCM
          </Link>
        </Button>
      </header>

      <section className="pb-5 pt-10">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          Một cuộc hẹn thật dễ
        </p>
        <h1 className="max-w-sm text-4xl font-black leading-[1.08] tracking-[-0.04em]">
          Hôm nay mình làm gì?
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-6 text-muted-foreground">
          Chọn một ý tưởng, tụi mình sẽ giúp bạn quyết định nhanh gọn.
        </p>
      </section>

      <section aria-label="Chọn hoạt động" className="grid grid-cols-2 gap-3">
        {intents.map((intent) => (
          <Link
            key={intent.label}
            href={intent.href}
            className="group min-h-36 rounded-3xl border border-border/60 bg-card p-4 shadow-[0_12px_35px_-28px_rgba(69,38,28,0.5)] transition-transform active:scale-[0.98]"
          >
            <span
              className={`grid size-12 place-items-center rounded-2xl text-2xl ${intent.tone}`}
              aria-hidden="true"
            >
              {intent.emoji}
            </span>
            <span className="mt-5 flex items-center justify-between text-lg font-extrabold">
              {intent.label}
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>

      <Card className="mt-3 overflow-hidden border-primary/10 bg-primary text-primary-foreground">
        <CardContent className="flex items-center gap-4">
          <span className="text-4xl" aria-hidden="true">🎲</span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Không biết ăn gì 😭</p>
            <p className="mt-1 text-sm text-primary-foreground/90">
              Trả lời 3 câu, để app chọn hộ.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            size="icon"
            aria-label="Chọn ngẫu nhiên"
          >
            <Link href="/explore?intent=random">
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-3 overflow-hidden border-rose-200 bg-rose-50">
        <CardContent className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-rose-600 shadow-sm">
            <HeartHandshake className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Chọn cùng người ấy</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hai người chọn riêng, app tìm gu chung.
            </p>
          </div>
          <Button asChild variant="outline" size="icon" aria-label="Mở Couple Mode">
            <Link href="/matches">
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
