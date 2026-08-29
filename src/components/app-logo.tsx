import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  compact?: boolean;
  className?: string;
};

export function AppLogo({ compact = false, className }: AppLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Heart className="size-5 fill-current" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-base font-extrabold tracking-tight">
          Đi Đâu Ăn Gì?
        </span>
      )}
    </div>
  );
}
