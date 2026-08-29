export function RestaurantDetailSkeleton() {
  return (
    <main className="animate-pulse pb-44" aria-label="Đang tải thông tin quán">
      <div className="aspect-[4/3] bg-secondary" />
      <div className="space-y-5 px-4 pt-5">
        <div className="h-4 w-28 rounded-full bg-secondary" />
        <div className="h-9 w-4/5 rounded-xl bg-secondary" />
        <div className="h-5 w-2/3 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="h-52 rounded-3xl bg-muted" />
      </div>
    </main>
  );
}
