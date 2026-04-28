export function EmptyState({ message, icon }: { message: string, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center text-gray-500 animate-in fade-in duration-300">
      <div className="w-20 h-20 mb-6 bg-white/5 rounded-3xl flex items-center justify-center shadow-inner border border-white/5 text-gray-400">
        {icon || (
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
      <p className="text-sm max-w-sm leading-relaxed">{message}</p>
    </div>
  );
}