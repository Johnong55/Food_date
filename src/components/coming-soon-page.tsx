import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";

type ComingSoonPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ComingSoonPage({ eyebrow, title, description }: ComingSoonPageProps) {
  return (
    <main className="flex min-h-[calc(100svh-6rem)] flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <AppLogo compact />
      <section className="my-auto pb-20">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">{title}</h1>
        <p className="mt-4 max-w-sm leading-7 text-muted-foreground">{description}</p>
        <Button className="mt-7" variant="outline" asChild>
          <Link href="/">
            <ArrowLeft />
            Về trang chủ
          </Link>
        </Button>
      </section>
    </main>
  );
}
