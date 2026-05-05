import { useState, useEffect } from 'react';
import { TableSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/ToastProvider';

interface VaultTabProps {
  api: string;
  authHeaders: HeadersInit;
  addLog: (msg: string) => void;
}

export function VaultTab({ api, authHeaders, addLog }: VaultTabProps) {
  const { addToast } = useToast();
  const [vaultData, setVaultData] = useState<any[]>([]);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultCurrentPage, setVaultCurrentPage] = useState(1);
  const [vaultTotalPages, setVaultTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const query = new URLSearchParams({
        page: vaultCurrentPage.toString(),
        limit: "100",
        ...(vaultSearch ? { search: vaultSearch } : {})
      });
      
      fetch(`${api}/api/v2/admin/swarm-vault?${query.toString()}`, { 
        headers: authHeaders,
        signal: controller.signal
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success) {
            setVaultData(data.data);
            setVaultTotalPages(data.pagination?.total_pages || 1);
          } else {
             addToast(data?.error || 'Failed to fetch vault data', 'error');
          }
          setIsLoading(false);
        }).catch(err => {
          if (err.name === 'AbortError') return;
          console.error(err);
          addToast('Network error fetching vault data', 'error');
          setIsLoading(false);
        });
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [api, authHeaders, vaultCurrentPage, vaultSearch, addToast]);

  const handleExportVault = async () => {
    setIsExporting(true);
    addLog("Exporting Swarm Vault as CSV...");
    try {
      const res = await fetch(`${api}/api/v2/admin/swarm-vault/export`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "swarm_vault_backup.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast("Export complete!", 'success');
    } catch (e: any) {
      addToast(`Export Error: ${e.message}`, 'error');
    }
    setIsExporting(false);
  };

  const handleExportVaultTelegram = async () => {
    setIsExporting(true);
    addLog("Sending Swarm Vault backup to @myorca5_bot...");
    try {
      const res = await fetch(`${api}/api/v2/admin/swarm-vault/export-tg`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      if (data.success) {
         addToast(data.message, 'success');
      } else {
         addToast(`Telegram Export Failed: ${data.error}`, 'error');
      }
    } catch (e: any) {
      addToast(`Network Error: ${e.message}`, 'error');
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Swarm Vault Backup
          </h2>
          <p className="text-sm text-gray-400">Pusat perlindungan data URL Proxy Telegram. Eksport database HLS Swarm.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={handleExportVaultTelegram} disabled={isExporting} className="px-5 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            Send to @myorca5_bot
          </button>
          <button onClick={handleExportVault} disabled={isExporting} className="px-5 py-2.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export to CSV
          </button>
        </div>
      </div>

      <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-4 flex flex-col gap-4">
        <div className="relative w-full">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search Anime ID or Title in Vault..." 
            value={vaultSearch}
            onChange={(e) => { setVaultSearch(e.target.value); setVaultCurrentPage(1); }}
            className="w-full bg-black/50 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </div>

      <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : vaultData.length === 0 ? (
            <EmptyState message="No secure backups matched your criteria." />
          ) : (
            <div className="divide-y divide-white/5">
              {vaultData.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 w-full">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex flex-col items-center justify-center shrink-0 border border-purple-500/20">
                      <span className="text-[9px] text-purple-400 font-bold uppercase">EP</span>
                      <span className="text-sm font-black text-white leading-none">{item.episodeNumber}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate text-white">{item.title || 'Unknown Title'}</h3>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">{item.providerId}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">ID: {item.anilistId}</span>
                        <span className="text-[10px] text-gray-600 truncate">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate w-full mt-1.5 opacity-70 bg-black/50 p-1.5 rounded">
                        {item.episodeUrl}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {vaultTotalPages > 1 && (
          <div className="bg-black/30 border-t border-white/5 p-4 flex justify-between items-center">
            <button disabled={vaultCurrentPage === 1} onClick={() => setVaultCurrentPage(p => p - 1)} className="px-5 py-2.5 bg-[#1C1C1E] border border-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all">Previous</button>
            <span className="text-sm font-medium text-gray-400">{vaultCurrentPage} of {vaultTotalPages}</span>
            <button disabled={vaultCurrentPage === vaultTotalPages} onClick={() => setVaultCurrentPage(p => p + 1)} className="px-5 py-2.5 bg-[#1C1C1E] border border-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}