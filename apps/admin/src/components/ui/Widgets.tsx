export function MetricBox({ label, value, color }: any) {
  return (
    <div className={`bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 flex flex-col justify-end min-h-[120px]`}>
      <div className={`text-4xl font-black tracking-tight mb-2 ${color}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">{label}</div>
    </div>
  );
}

export function ListButton({ onClick, title, subtitle, icon, color, loading }: any) {
  return (
    <button onClick={onClick} disabled={loading} className="w-full flex items-center gap-4 bg-black/50 border border-white/5 hover:border-white/20 p-4 rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98] text-left group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${color}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{title}</h3>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{subtitle}</p>
      </div>
      <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

export function DataWidget({ title, value, caption, color }: any) {
  return (
    <div className={`bg-[#1C1C1E] border-t-2 ${color} rounded-[2rem] p-6 border-x border-b border-white/5`}>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">{title}</h3>
      <p className="text-3xl font-black text-white mb-2 tracking-tight">{value}</p>
      <p className="text-sm text-gray-400">{caption}</p>
    </div>
  );
}

export function StackRow({ title, desc }: any) {
  return (
    <div className="p-6 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 hover:bg-white/5 transition-colors">
      <h3 className="w-48 font-semibold text-white text-sm">{title}</h3>
      <p className="flex-1 text-sm text-gray-400">{desc}</p>
    </div>
  );
}