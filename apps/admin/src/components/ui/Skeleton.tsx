export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-white/5 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-14 rounded-lg bg-white/5 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-white/5 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-4 w-12 bg-white/5 rounded" />
            <div className="h-3 w-16 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}