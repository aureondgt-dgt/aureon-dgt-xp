export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" style={{ animationDelay: `${index * 60}ms` }} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl border border-white/8 bg-white/[0.02] xl:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />
      </div>
      <p className="text-center text-[0.65rem] uppercase tracking-[0.24em] text-white/20">Carregando Aureon XP...</p>
    </div>
  );
}
