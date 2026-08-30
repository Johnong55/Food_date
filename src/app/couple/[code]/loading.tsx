export default function LoadingCoupleRoom() {
  return (
    <main className="animate-pulse space-y-4 px-4 py-6" aria-label="Đang tải Couple Session">
      <div className="h-11 w-28 rounded-2xl bg-muted" />
      <div className="h-40 rounded-3xl bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 rounded-3xl bg-muted" />
        <div className="h-32 rounded-3xl bg-muted" />
      </div>
      <div className="h-72 rounded-3xl bg-muted" />
    </main>
  );
}
