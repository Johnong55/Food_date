"use client";

import { BadgeCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  estimateMenuForTwo,
  formatMenuItemPrice,
  formatMenuSource,
  formatMenuUpdatedAt,
} from "@/features/menu/menu-formatters";
import { safeExternalUrl } from "@/features/restaurant/place-formatters";
import { cn } from "@/lib/utils";
import type { ResolvedMenu } from "@/types/menu";

type MenuViewProps = {
  menu: ResolvedMenu;
  placeName?: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function MenuView({ menu, placeName }: MenuViewProps) {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const normalizedQuery = normalizeSearch(query);
  const sourceUrl = safeExternalUrl(menu.sourceUrl);
  const estimate = estimateMenuForTwo(menu);

  const visibleSections = useMemo(
    () =>
      menu.sections
        .filter(
          (section) => activeSection === "all" || section.id === activeSection,
        )
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (!normalizedQuery) return true;
            return normalizeSearch(`${item.name} ${item.description ?? ""}`).includes(
              normalizedQuery,
            );
          }),
        }))
        .filter((section) => section.items.length > 0),
    [activeSection, menu.sections, normalizedQuery],
  );

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Menu
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">
          {placeName ?? "Thực đơn của quán"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            <BadgeCheck className="size-3.5" />
            {formatMenuSource(menu)}
          </span>
          <span>Cập nhật {formatMenuUpdatedAt(menu.lastUpdated)}</span>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block min-h-11 py-3 text-xs font-bold text-primary underline-offset-4 hover:underline"
          >
            Xem nguồn menu
          </a>
        )}
      </section>

      {estimate && (
        <Card className="border-primary/20 bg-primary/8">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-primary">Ước tính cho 2 người</p>
            <p className="mt-1 text-xl font-black">
              {formatMenuItemPrice(estimate.minimum, estimate.currency)} –{" "}
              {formatMenuItemPrice(estimate.maximum, estimate.currency)}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Tham khảo từ menu đã xác minh; chi phí thực tế tùy món gọi.
            </p>
          </CardContent>
        </Card>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <span className="sr-only">Tìm món</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm món…"
          className="min-h-12 w-full rounded-2xl border border-input bg-card pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Nhóm món"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "all"}
          onClick={() => setActiveSection("all")}
          className={cn(
            "min-h-11 shrink-0 rounded-full px-4 text-xs font-bold",
            activeSection === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          Tất cả
        </button>
        {menu.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-xs font-bold",
              activeSection === section.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {section.name}
          </button>
        ))}
      </div>

      {visibleSections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Không tìm thấy món phù hợp với “{query}”.
          </CardContent>
        </Card>
      ) : (
        visibleSections.map((section) => (
          <section key={section.id} aria-labelledby={`menu-section-${section.id}`}>
            <h2
              id={`menu-section-${section.id}`}
              className="mb-2 text-lg font-black"
            >
              {section.name}
            </h2>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {section.items.map((item) => (
                  <article key={item.id} className="flex gap-3 px-4 py-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold leading-6">{item.name}</h3>
                      {item.description && (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-black text-primary">
                      {formatMenuItemPrice(item.price, item.currency)}
                    </p>
                  </article>
                ))}
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
