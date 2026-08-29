export default function ExploreLoading() {
  return (
    <main className="animate-pulse px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <div className="size-11 rounded-2xl bg-muted" />
        <div className="h-4 w-20 rounded-full bg-muted" />
        <div className="size-11 rounded-2xl bg-muted" />
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-muted" />
      <div className="mt-10 h-4 w-24 rounded-full bg-muted" />
      <div className="mt-3 h-10 w-72 max-w-full rounded-2xl bg-muted" />
      <div className="mt-3 h-5 w-full rounded-xl bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-20 rounded-3xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
