import { cn } from "@/lib/utils";

export function GoogleMapsAttribution({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center justify-end gap-1 text-[11px] text-muted-foreground",
        className,
      )}
      aria-label="Dữ liệu địa điểm do Google Maps cung cấp"
      translate="no"
    >
      <span>Dữ liệu từ</span>
      <span className="font-semibold tracking-tight text-foreground">Google Maps</span>
    </p>
  );
}
