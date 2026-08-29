import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SelectionChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  selected: boolean;
  children: ReactNode;
  leading?: ReactNode;
  layout?: "chip" | "card";
};

export function SelectionChip({
  selected,
  children,
  leading,
  layout = "chip",
  className,
  ...props
}: SelectionChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-11 items-center justify-center gap-2 border text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]",
        layout === "chip" && "rounded-2xl px-3.5 py-2.5",
        layout === "card" && "min-h-20 justify-start rounded-3xl px-4 py-3 text-left",
        selected
          ? "border-primary bg-primary/9 text-primary shadow-[0_8px_24px_-20px_rgba(205,73,51,0.8)]"
          : "border-border/80 bg-card text-foreground hover:border-primary/35",
        className,
      )}
      {...props}
    >
      {leading && <span className="text-lg" aria-hidden="true">{leading}</span>}
      <span>{children}</span>
      {selected && layout === "card" && (
        <span className="ml-auto grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
