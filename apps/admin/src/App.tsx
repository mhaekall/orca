import { useState, useEffect, useMemo } from "react";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";
import { SidebarItem } from "./components/layout/SidebarItem";
import { MobileDock } from "./components/layout/MobileDock";
import { DatabaseTab } from "./components/tabs/DatabaseTab";
import { VaultTab } from "./components/tabs/VaultTab";
import { MissionControlTab } from "./components/tabs/MissionControlTab";
import { DataWidget, StackRow } from "./components/ui/Widgets";

const API = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

function MainApp() {
  const { addToast } = useToast();
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("insights"); 
  
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [stats, setStats] = useState<any>(null);
  const [ingestionStats, setIngestionStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ingestTasks, setIngestTasks] = useState<any[]>([]);

  // Pass down state handlers for MissionControlTab

  const verifyToken = async (key: string) => {
    try {
      const res = await fetch(`${API}/api/v2/admin/verify`, {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassword(key);
        setAuth(true);
        localStorage.setItem("orcaSysAuth", "true");
        localStorage.setItem("orcaSysKey", key);
      } else {
        throw new Error(data.error || 'Invalid passcode');
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Session expired", 'error');
      handleLogout();
    }
  };

  useEffect(() => {
    const savedAuth = localStorage.getItem("orcaSysAuth");
    const savedKey = localStorage.getItem("orcaSysKey");
    if (savedAuth === "true" && savedKey) {
      verifyToken(savedKey);
    }
  }, [addToast]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const authHeaders = useMemo(() => ({ 'x-admin-key': password }), [password]);

  const fetchData = () => {
    if (!password) return;

    fetch(`${API}/api/v2/admin/stats`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          setStats({ total_anime: data.total_anime, total_episodes: data.total_episodes });
          setIngestionStats({ ingested: data.ingested_episodes || 0, pending: data.pending_episodes || 0 });
        }
      }).catch(console.error);

    fetch(`${API}/api/v2/admin/analytics`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          setAnalytics(data);
        }
      }).catch(console.error);

    fetch(`${API}/api/v2/admin/cache-stats`, { headers: authHeaders })
      .then(async res => {
        if (res.ok) setCacheStats(await res.json());
        else if (res.status === 401) setCacheStats({ error: "Invalid Admin Key / Unauthorized" });
      }).catch(console.error);

    fetch(`${API}/api/v2/admin/ingest-stats`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          setIngestTasks(data.active_tasks || []);
          if (data.logs && data.logs.length > 0) {
            setLogs(prev => {
              const newLogs = [...prev];
              data.logs.forEach((log: string) => {
                if (!newLogs.includes(log)) newLogs.push(log);
              });
              return newLogs.slice(0, 100);
            });
          }
        }
      }).catch(console.error);
  };

  useEffect(() => {
    if (!auth) return;
    fetchData();
    // Only poll terminal feed/ingest stats, not the heavy DB
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyToken(password);
  };

  const handleLogout = () => {
    setAuth(false);
    setPassword("");
    localStorage.removeItem("orcaSysAuth");
    localStorage.removeItem("orcaSysKey");
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1C1C1E] p-8 rounded-[2.5rem] border border-white/5 w-full max-w-sm shadow-2xl">
          <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-inner border border-white/5">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">System Terminal</h2>
          <p className="text-sm text-gray-500 text-center mb-8">Authenticate to access Orca internal controls.</p>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3.5 mb-4 text-center focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Passcode"
            autoFocus
          />
          <button type="submit" className="w-full bg-white text-black font-bold py-3.5 rounded-2xl hover:bg-gray-200 transition-colors active:scale-95">
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/30 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 hidden md:flex flex-col bg-[#1C1C1E]/30 backdrop-blur-3xl sticky top-0 h-screen">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">OrcaSys</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Central Command</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          <SidebarItem active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Insights" />
          <SidebarItem active={activeTab === 'database'} onClick={() => setActiveTab('database')} icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" label="Database" />
          <SidebarItem active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" label="Swarm Vault" />
          <SidebarItem active={activeTab === 'cache'} onClick={() => setActiveTab('cache')} icon="M13 10V3L4 14h7v7l9-11h-7z" label="Edge Cache" />
          <SidebarItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Users" />
          <SidebarItem active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Monetization" />
          <SidebarItem active={activeTab === 'ecosystem'} onClick={() => setActiveTab('ecosystem')} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" label="Ecosystem" />
        </nav>
        
        <div className="p-6 pt-2">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl text-sm font-bold transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full pb-32 md:pb-8">
        <header className="mb-8 md:mb-10 mt-2 md:mt-0 flex justify-between items-end px-2 md:px-0">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p className="text-gray-400 font-medium">Real-time system telemetry and controls.</p>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          {/* --- TAB: INSIGHTS --- */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 flex flex-col justify-end min-h-[120px]">
                  <div className="text-4xl font-black tracking-tight mb-2 text-white">{stats?.total_anime?.toLocaleString() || "..."}</div>
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Anime Total</div>
                </div>
                <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 flex flex-col justify-end min-h-[120px]">
                  <div className="text-4xl font-black tracking-tight mb-2 text-indigo-400">{stats?.total_episodes?.toLocaleString() || "..."}</div>
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Episodes Found</div>
                </div>
                <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 flex flex-col justify-end min-h-[120px]">
                  <div className="text-4xl font-black tracking-tight mb-2 text-purple-400">{ingestionStats?.ingested?.toLocaleString() || "..."}</div>
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">TG Swarm HLS</div>
                </div>
                <div className="bg-[#1C1C1E] border border-white/5 rounded-[2rem] p-5 flex flex-col justify-end min-h-[120px]">
                  <div className="text-4xl font-black tracking-tight mb-2 text-orange-400">{ingestionStats?.pending?.toLocaleString() || "..."}</div>
                  <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Queue/Pending</div>
                </div>
              </section>

              <MissionControlTab 
                api={API} 
                authHeaders={authHeaders} 
                loading={loading} 
                setLoading={setLoading}
                logs={logs}
                ingestTasks={ingestTasks}
                setActiveTab={setActiveTab}
                fetchData={fetchData}
              />
            </div>
          )}

          {/* --- TAB: DATABASE --- */}
          {activeTab === 'database' && (
            <DatabaseTab 
              api={API} 
              authHeaders={authHeaders} 
              handleAction={async () => {}} // simplified for this refactor
            />
          )}

          {/* --- TAB: VAULT --- */}
          {activeTab === 'vault' && (
            <VaultTab 
              api={API} 
              authHeaders={authHeaders} 
              loading={loading} 
              setLoading={setLoading} 
              addLog={addLog} 
            />
          )}

          {/* --- TAB: EDGE CACHE --- */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              {!cacheStats ? (
                <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-10 text-center text-gray-500">
                  <p>Awaiting cache telemetry from Edge node...</p>
                </div>
              ) : cacheStats.error ? (
                <div className="bg-red-500/10 rounded-[2rem] border border-red-500/20 p-10 text-center text-red-500">
                  <p className="font-bold mb-1">Access Denied</p>
                  <p className="text-sm">{cacheStats.error}. Please check your passcode and try logging in again.</p>
                  <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
                    Re-Authenticate
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DataWidget title="L0 Instance LRU" value={`${cacheStats.l0_entries} / ${cacheStats.l0_max}`} caption="~0ms Latency" color="border-yellow-500/30" />
                    <DataWidget title="L1 Global Edge Redis" value="Distributed" caption="~1-5ms Latency via Upstash" color="border-red-500/30" />
                    <DataWidget title="L2 Serverless DB" value={cacheStats.l2_pg_entries ?? 'Err'} caption="~10-30ms Cold Store" color="border-blue-500/30" />
                  </div>

                  <div className="bg-gradient-to-br from-[#1C1C1E] to-black rounded-[2rem] border border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight mb-2 text-white">Coalesced L3 Engine</h2>
                      <p className="text-sm text-gray-400 max-w-md leading-relaxed">Active in-flight scraper tasks. Duplicate requests to the same episode concurrently are coalesced to prevent redundant scraping, utilizing Stale-While-Revalidate pattern.</p>
                    </div>
                    <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-indigo-600">
                      {cacheStats.inflight_scrapes}
                    </div>
                  </div>

                  <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-6 md:p-8">
                    <h2 className="text-lg font-semibold tracking-tight mb-6">Provider Circuit Breakers</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(cacheStats.circuit_breakers || {}).map(([provider, state]: [string, any]) => (
                        <div key={provider} className="bg-black/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                          <span className="font-semibold text-sm capitalize text-white">{provider}</span>
                          <span className={`w-fit px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest
                            ${state === 'closed' ? 'bg-green-500/10 text-green-500' : state === 'open' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {state === 'closed' ? 'HEALTHY' : state === 'open' ? 'BLOCKED' : state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB: USERS --- */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataWidget title="Total Users" value={analytics?.real_users || "0"} caption="Registered Accounts" color="border-indigo-500/30" />
                <DataWidget title="Premium Users" value="0" caption="Active Subscriptions" color="border-purple-500/30" />
                <DataWidget title="Conversion" value="0%" caption="Free to Premium" color="border-blue-500/30" />
                <DataWidget title="Avg Watch Time" value="--m" caption="Per Session" color="border-green-500/30" />
              </div>
              
              <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">This module will allow you to manage registered users, upgrade accounts to Premium, and handle ban/suspend actions. Feature currently in development.</p>
              </div>
            </div>
          )}

          {/* --- TAB: MONETIZATION --- */}
          {activeTab === 'monetization' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DataWidget title="MRR" value="Rp 0" caption="Monthly Recurring Rev" color="border-emerald-500/30" />
                <DataWidget title="Saweria/Trakteer" value="Rp 0" caption="One-time Donations" color="border-yellow-500/30" />
                <DataWidget title="Server Costs" value="$0" caption="Neon + CF + HF" color="border-red-500/30" />
              </div>
              
              <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Monetization Hub</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">Connect Payment Gateways (Midtrans, Saweria, Trakteer) to automate Premium role provisioning and track platform revenue.</p>
                <button className="mt-6 px-6 py-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-bold text-sm transition-colors">
                  Setup Payment Gateway
                </button>
              </div>
            </div>
          )}

          {/* --- TAB: ECOSYSTEM --- */}
          {activeTab === 'ecosystem' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DataWidget title="Web Pages" value="11" caption="Next.js App Router" color="border-white/10" />
                <DataWidget title="Web Components" value="31" caption="React Server & Client" color="border-white/10" />
                <DataWidget title="API Endpoints" value="15+" caption="FastAPI Routes" color="border-white/10" />
              </div>

              <div className="bg-[#1C1C1E] rounded-[2rem] border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold tracking-tight">Full Production Stack</h2>
                </div>
                <div className="divide-y divide-white/5">
                  <StackRow title="Frontend Web" desc="Next.js 15, TailwindCSS v4, React 19" />
                  <StackRow title="Backend API" desc="FastAPI (Python 3.10), Uvicorn, SQLAlchemy" />
                  <StackRow title="Database (L2)" desc="Neon Postgres (Serverless DB, connection pooler)" />
                  <StackRow title="Global Cache (L1)" desc="Upstash Redis & QStash (for background cron)" />
                  <StackRow title="Deployment" desc="Cloudflare Pages (Frontend) & Hugging Face Spaces (API)" />
                  <StackRow title="Video Storage Proxy" desc="Telegram Swarm Proxy via Cloudflare Workers" />
                  <StackRow title="Providers" desc="Oploverz, Samehadaku, Kuronime, Otakudesu" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileDock activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}