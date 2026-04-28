import { useState, useEffect } from 'react';
import type { AnimeRow, EpisodeRow } from '../../types';
import { TableSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/ToastProvider';

interface DatabaseTabProps {
  api: string;
  authHeaders: HeadersInit;
  handleAction: (endpoint: string, label: string) => Promise<void>;
}

export function DatabaseTab({ api, authHeaders, handleAction }: DatabaseTabProps) {
  const { addToast } = useToast();
  
  const [dbData, setDbData] = useState<AnimeRow[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [onlyTg, setOnlyTg] = useState(false);
  const [provider, setProvider] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const ITEMS_PER_PAGE = 50;

  // Expansion
  const [expandedAnimeId, setExpandedAnimeId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [epLoading, setEpLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<number, any>>({});

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        hide_empty: hideEmpty.toString(),
        only_tg: onlyTg.toString(),
        ...(search ? { search } : {}),
        ...(provider ? { provider } : {})
      });
      
      fetch(`${api}/api/v2/admin/database?${query.toString()}`, { headers: authHeaders })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success) {
            setDbData(data.data);
            setTotalPages(data.pagination?.total_pages || 1);
          } else {
             addToast(data?.error || 'Failed to fetch database', 'error');
          }
          setIsLoading(false);
        }).catch(err => {
          console.error(err);
          addToast('Network error fetching database', 'error');
          setIsLoading(false);
        });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [api, authHeaders, currentPage, search, hideEmpty, onlyTg, provider, addToast]);

  const toggleAnimeEpisodes = async (anime: AnimeRow) => {
    if (expandedAnimeId === anime.anilistId) {
      setExpandedAnimeId(null);
      return;
    }
    setExpandedAnimeId(anime.anilistId);
    setEpisodes([]);
    setDiagnostics({});
    setEpLoading(true);
    try {
      const res = await fetch(`${api}/api/v2/admin/anime/${anime.anilistId}/episodes`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.data);
      } else {
        addToast(`Failed to fetch episodes: ${data.error}`, 'error');
      }
    } catch (e: any) {
      addToast(`Network Error: ${e.message}`, 'error');
    }
    setEpLoading(false);
  };

  const handleDiagnose = async (ep: EpisodeRow) => {
    setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: true } }));
    try {
      const res = await fetch(`${api}/api/v2/admin/episode/diagnose`, { 
        method: "POST", 
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ep.episodeUrl })
      });
      const data = await res.json();
      setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: false, result: data } }));
    } catch (e: any) {
      setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: false, result: { success: false, status: "Network Error" } } }));
    }
  };

  const handleReingestEpisode = async (ep: EpisodeRow) => {
    if (!confirm(`Yakin ingin men-delete dan mem-force re-ingest Episode ${ep.episodeNumber}?`)) return;
    
    setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: true } }));
    try {
      const res = await fetch(`${api}/api/v2/admin/episode/${ep.id}/reingest`, { 
        method: "POST", 
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        addToast(`✅ Ep ${ep.episodeNumber} reingest queued!`, 'success');
        setEpisodes(prev => prev.filter(e => e.id !== ep.id));
      } else {
        addToast(`❌ Gagal: ${data.error}`, 'error');
        setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: false, result: data } }));
      }
    } catch (e: any) {
      addToast(`❌ Network Error reingest Ep ${ep.episodeNumber}`, 'error');
      setDiagnostics(prev => ({ ...prev, [ep.id]: { loading: false } }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-4 flex flex-col gap-4">
        <div className="relative w-full">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search Anime ID or Title..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full bg-black/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mr-2">Filters:</span>
          
          <select 
            value={provider} 
            onChange={(e) => { setProvider(e.target.value); setCurrentPage(1); }}
            className="bg-black/50 border border-white/20 text-xs rounded-lg px-2 py-1.5 focus:outline-none text-gray-300 transition-colors hover:border-white/40 cursor-pointer"
          >
            <option value="">All Providers</option>
            <option value="oploverz">Oploverz</option>
            <option value="samehadaku">Samehadaku</option>
            <option value="kuronime">Kuronime</option>
            <option value="otakudesu">Otakudesu</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${hideEmpty ? 'bg-purple-500 border-purple-500 text-white' : 'bg-black/50 border-white/20 text-transparent group-hover:border-white/40'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Hide Empty Episodes</span>
            <input type="checkbox" className="hidden" checked={hideEmpty} onChange={(e) => { setHideEmpty(e.target.checked); setCurrentPage(1); }} />
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${onlyTg ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-black/50 border-white/20 text-transparent group-hover:border-white/40'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Only show Telegram Swarm</span>
            <input type="checkbox" className="hidden" checked={onlyTg} onChange={(e) => { setOnlyTg(e.target.checked); setCurrentPage(1); }} />
          </label>
        </div>
      </div>

      <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : dbData.length === 0 ? (
            <EmptyState message="No anime matched your search or filter criteria. Try clearing some filters." />
          ) : (
            <div className="divide-y divide-white/5">
              {dbData.map((item) => (
                <div key={item.anilistId} className="flex flex-col">
                  <div onClick={() => toggleAnimeEpisodes(item)} className={`flex items-center justify-between p-3 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10 ${expandedAnimeId === item.anilistId ? 'bg-white/5' : ''}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <img src={item.cover} alt="" className="w-10 h-14 rounded-lg object-cover bg-black shrink-0 border border-white/5 shadow-sm" loading="lazy" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[14px] truncate pr-4 text-white leading-tight">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 font-mono">ID: {item.anilistId}</span>
                          {item.providerId && <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{item.providerId}</span>}
                          <span className="text-[10px] text-gray-500">{item.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4 flex items-center gap-4">
                      <div className="hidden sm:flex flex-col items-end mr-4">
                        {item.tg_count > 0 && <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mb-1">TG Swarm: {item.tg_count}</span>}
                      </div>
                      {item.episode_count > 0 ? (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-white font-bold text-sm">
                          {item.episode_count}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded uppercase tracking-wider">Empty</span>
                      )}
                      <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedAnimeId === item.anilistId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  
                  {/* Inline Expansion Area */}
                  {expandedAnimeId === item.anilistId && (
                    <div className="bg-black/40 border-t border-white/5 p-4 inset-shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Episode Directory</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(confirm("Force Re-Ingest anime ini?")) {
                              handleAction(`/api/v2/anime/${item.anilistId}/debug-sync`, "Force Re-Ingest");
                            }
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors uppercase tracking-wider"
                        >
                          Force Re-Ingest All
                        </button>
                      </div>
                      {epLoading ? (
                        <div className="flex justify-center items-center h-20">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : episodes.length === 0 ? (
                        <div className="text-center p-4 text-gray-500 text-xs">No episodes mapped.</div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {episodes.map(ep => {
                            const diag = diagnostics[ep.id];
                            const isTg = ep.episodeUrl.includes('tg-proxy') || ep.episodeUrl.includes('workers.dev');
                            return (
                              <div key={ep.id} className="bg-[#1C1C1E] border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-white/5 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-black flex flex-col items-center justify-center shrink-0 border border-white/5">
                                  <span className="text-[8px] text-gray-500 font-bold uppercase">EP</span>
                                  <span className="text-sm font-black text-white leading-none">{ep.episodeNumber}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {isTg && <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">TG PROXY</span>}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono truncate w-full" title={ep.episodeUrl}>{ep.episodeUrl}</div>
                                  {diag?.result && (
                                    <div className={`mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${diag.result.healthy ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {diag.result.healthy ? '✅ OK' : '❌ ERR'} • {diag.result.status}
                                    </div>
                                  )}
                                </div>
                                <div className="shrink-0 flex flex-col gap-1.5">
                                  {isTg && (
                                    <button onClick={() => handleDiagnose(ep)} disabled={diag?.loading} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-2 py-1 rounded text-[9px] font-bold disabled:opacity-50 transition-colors w-full">
                                      {diag?.loading ? '...' : 'Diagnose'}
                                    </button>
                                  )}
                                  <button onClick={() => handleReingestEpisode(ep)} disabled={diag?.loading} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 px-2 py-1 rounded text-[9px] font-bold disabled:opacity-50 transition-colors w-full">
                                    Re-Ingest
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-black/30 border-t border-white/5 p-4 flex justify-between items-center">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-5 py-2.5 bg-[#1C1C1E] border border-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all">Previous</button>
            <span className="text-sm font-medium text-gray-400">{currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-5 py-2.5 bg-[#1C1C1E] border border-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}