import { ListButton } from '../ui/Widgets';
import { useToast } from '../ui/ToastProvider';

interface MissionControlTabProps {
  api: string;
  authHeaders: HeadersInit;
  loading: boolean;
  setLoading: (l: boolean) => void;
  logs: string[];
  ingestTasks: any[];
  setActiveTab: (t: string) => void;
  fetchData: () => void;
}

export function MissionControlTab({
  api, authHeaders, loading, setLoading, logs, ingestTasks, 
  setActiveTab, fetchData
}: MissionControlTabProps) {
  const { addToast } = useToast();

  const handleAction = async (endpoint: string, label: string) => {
    setLoading(true);
    addToast(`Initiating: ${label}...`, 'info');
    try {
      const res = await fetch(`${api}${endpoint}`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
      } else {
        addToast(data.error || 'Unauthorized', 'error');
      }
    } catch (e: any) {
      addToast(`Network Error: ${e.message}`, 'error');
    }
    setLoading(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#1C1C1E] rounded-[2rem] p-6 border border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Mission Control</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ListButton onClick={() => handleAction('/api/v2/admin/trigger-prefetch', 'Smart Pre-fetch')} title="Execute Smart Pre-fetch" subtitle="Ongoing anime -> Telegram Swarm" icon="M13 10V3L4 14h7v7l9-11h-7z" color="bg-indigo-500" loading={loading} />
          <ListButton onClick={() => handleAction('/api/v2/admin/mass-sync', 'Mass Sync')} title="Force Mass Synchronization" subtitle="Deep sync for top 100 recent updates" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" color="bg-purple-500" loading={loading} />
          <ListButton onClick={() => handleAction('/api/v2/admin/sync-missing', 'Retry 0 Eps')} title="Retry Missing Episodes" subtitle="Re-evaluate anime with 0 episodes" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" color="bg-orange-500" loading={loading} />
          <ListButton onClick={() => {
            const id = prompt("Target AniList ID:");
            if(id) handleAction(`/api/v2/anime/${id}/debug-sync`, `Manual Scrape ID ${id}`);
          }} title="Manual ID Scrape" subtitle="Force sync a specific AniList ID" icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" color="bg-gray-500" loading={loading} />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-6 h-80 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Active Ingestions
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {ingestTasks.length === 0 ? (
              <p className="text-sm text-gray-500">No active tasks in Swarm.</p>
            ) : (
              ingestTasks.map((t: any, i) => (
                <div key={i} className="flex flex-col gap-2 cursor-pointer" onClick={() => {
                  setActiveTab('database');
                }}>
                  <div className="flex justify-between items-center text-sm hover:text-purple-400 transition-colors">
                    <span className="font-semibold truncate">ID: {t.anilist_id} <span className="text-gray-500">| Ep {t.episode}</span></span>
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-bold uppercase">{t.progress?.status || 'RUNNING'}</span>
                  </div>
                  {t.progress?.progress && (
                    <div className="h-1.5 bg-black rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, parseInt(t.progress.progress)))}%` }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-black rounded-[2rem] border border-white/5 p-6 h-80 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Terminal Feed
          </h3>
          <div className="flex-1 overflow-y-auto font-mono text-[11px] text-green-400 leading-relaxed flex flex-col-reverse custom-scrollbar">
            {logs.length === 0 ? <span className="opacity-50">Awaiting telemetry...</span> : logs.map((log, i) => <div key={i} className="pb-1 opacity-80">{log}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}