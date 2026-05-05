export function SlimDockItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center min-w-[4.5rem] py-1.5 transition-all duration-200 snap-center">
      <div className={`relative px-4 py-1.5 rounded-full transition-colors ${active ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <span className={`text-[9px] mt-1 tracking-wide ${active ? 'text-white font-bold' : 'text-gray-500 font-medium'}`}>{label}</span>
    </button>
  );
}

export function MobileDock({ activeTab, setActiveTab }: any) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1C1C1E]/95 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
       <div className="flex items-center px-2 pt-2 pb-2 overflow-x-auto custom-scrollbar snap-x snap-mandatory">
         <SlimDockItem active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Insights" />
         <SlimDockItem active={activeTab === 'database'} onClick={() => setActiveTab('database')} icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" label="Database" />
         <SlimDockItem active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" label="Vault" />
         <SlimDockItem active={activeTab === 'cache'} onClick={() => setActiveTab('cache')} icon="M13 10V3L4 14h7v7l9-11h-7z" label="Edge" />
         <SlimDockItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Users" />
         <SlimDockItem active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Revenue" />
         <SlimDockItem active={activeTab === 'ecosystem'} onClick={() => setActiveTab('ecosystem')} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" label="Ecosystem" />
       </div>
    </nav>
  );
}