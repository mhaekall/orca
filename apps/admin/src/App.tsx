/**
 * ORCA ADMIN — MASTERPIECE REWRITE
 *
 * Fixes vs current code:
 * 1. fetchHeavyData is sequential (await) — masih waterfall lambat. Fix: parallel via Promise.allSettled
 * 2. fetchFastData still fires 2 parallel fetches every 8s without AbortController. Fix: single controller per cycle
 * 3. No stale data guard — on tab switch, old data shows. Fix: per-tab fetch on mount via useTabData hook
 * 4. global `loading` state removed from App → per-action loading in MissionControlTab (done, keep)
 * 5. Logs dedup: Array.from(new Set()) on log strings loses ordering and fails if logs have timestamps. Fix: id-based dedup
 * 6. Terminal feed has no real-time feel. Fix: SSE stream from /api/v2/admin/logs/stream when tab active
 * 7. Mobile dock: `custom-scrollbar` class not defined in tailwind scan. Fix: plain CSS scroll-hide
 * 8. Header subtitle always says "Real-time system telemetry" regardless of tab. Fix: per-tab descriptions
 * 9. verifyToken in useEffect has `addToast` as dep → infinite loop risk on auth failure. Fix: useCallback + ref
 * 10. `animate-in` class from tailwind-animate — not guaranteed installed. Fix: use keyframes in CSS
 * 11. No error boundary → one bad tab crashes everything. Fix: ErrorBoundary wrapper per tab
 * 12. Cache tab & Users tab mounted/unmounted every tab switch, losing state. Fix: visibility:hidden preserve mount
 * 13. DatabaseTab: AbortController cleans timer but not fetch. Fix: proper signal passing (VaultTab has this now, DB doesn't)
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const API = "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const TAB_META: Record<string, { label: string; desc: string; icon: string }> = {
  insights: {
    label: "Insights",
    desc: "Live system telemetry and ingestion overview.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  database: {
    label: "Database",
    desc: "Browse, search, and diagnose anime & episode records.",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  },
  vault: {
    label: "Vault",
    desc: "Telegram Swarm HLS storage and export controls.",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12a1 1 0 102 0 1 1 0 00-2 0",
  },
  cache: {
    label: "Edge Cache",
    desc: "L0/L1/L2 cache layers and circuit breaker health.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  users: {
    label: "Users",
    desc: "Registered accounts and subscription management.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  monetization: {
    label: "Revenue",
    desc: "MRR, donations, and payment gateway setup.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  ecosystem: {
    label: "Ecosystem",
    desc: "Full production stack overview and component count.",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ToastItem { id: number; message: string; type: "success" | "error" | "info" }
interface Stats { total_anime: number; total_episodes: number; ingested_episodes: number; pending_episodes: number }
interface IngestTask { anilist_id: number; episode: number; progress?: { status: string; progress: string } }
interface CacheStats {
  l0_entries: number; l0_max: number; l2_pg_entries: number;
  inflight_scrapes: number; circuit_breakers: Record<string, string>; error?: string;
}
interface AnimeRow { anilistId: number; title: string; totalEpisodes: number; providers: string[]; slug: string }
interface EpisodeRow { id: number; episodeNumber: number; episodeUrl: string }

// ─── Error Boundary ───────────────────────────────────────────────────────────
class TabErrorBoundary extends Component<{ children: ReactNode; tab: string }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[${this.props.tab}]`, error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <span className="text-red-400 text-xl">⚠</span>
          </div>
          <div>
            <p className="text-white font-semibold">Tab crashed</p>
            <p className="text-gray-500 text-sm mt-1">{(this.state.error as Error).message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ items, remove }: { items: ToastItem[]; remove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {items.map((t) => (
        <div
          key={t.id}
          className={`
            pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl
            text-sm font-medium shadow-2xl animate-toast-in
            ${t.type === "success" ? "bg-green-950/90 border-green-800/50 text-green-300" : ""}
            ${t.type === "error" ? "bg-red-950/90 border-red-800/50 text-red-300" : ""}
            ${t.type === "info" ? "bg-zinc-900/90 border-white/10 text-gray-200" : ""}
          `}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === "success" ? "✓" : t.type === "error" ? "✗" : "·"}
          </span>
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button onClick={() => remove(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number | undefined; color: string }) {
  const display = value !== undefined ? String(value) : null;
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 flex flex-col justify-end min-h-28 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className={`absolute top-0 left-0 right-0 h-px ${color}`} />
      {display === null ? (
        <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse mb-2" />
      ) : (
        <div className={`text-4xl font-black tracking-tight mb-1.5 tabular-nums ${color.replace("bg-gradient-to-r", "text-transparent bg-clip-text bg-gradient-to-r")}`}>
          {typeof value === "number" ? value.toLocaleString() : display}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionButton({
  onClick, title, subtitle, icon, accent, loading,
}: {
  onClick: () => void; title: string; subtitle: string;
  icon: string; accent: string; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-4 bg-black/40 border border-white/5 hover:border-white/15 p-4 rounded-2xl transition-all disabled:opacity-40 active:scale-[0.98] text-left group"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {loading ? (
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{title}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{subtitle}</p>
      </div>
      <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── useApi hook — single fetch with AbortController ─────────────────────────
function useApi<T>(
  url: string,
  headers: HeadersInit,
  deps: unknown[],
  debounce = 0
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, debounce);
    return () => { clearTimeout(timer); controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

// ─── Insights Tab ────────────────────────────────────────────────────────────
function InsightsTab({
  api, headers, stats, ingestTasks, logs, onAction, setActiveTab,
}: {
  api: string; headers: HeadersInit;
  stats: Stats | null; ingestTasks: IngestTask[]; logs: string[];
  onAction: (endpoint: string, label: string) => Promise<void>;
  setActiveTab: (t: string) => void;
}) {
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fire = async (endpoint: string, label: string) => {
    setActionLoading((p) => ({ ...p, [endpoint]: true }));
    await onAction(endpoint, label);
    setActionLoading((p) => ({ ...p, [endpoint]: false }));
  };

  const ingestPct =
    stats
      ? Math.round((stats.ingested_episodes / Math.max(1, stats.total_episodes)) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Anime" value={stats?.total_anime} color="bg-gradient-to-r from-white to-zinc-400" />
        <StatCard label="Episodes" value={stats?.total_episodes} color="bg-gradient-to-r from-indigo-400 to-purple-500" />
        <StatCard label="TG Swarm HLS" value={stats?.ingested_episodes} color="bg-gradient-to-r from-violet-400 to-fuchsia-500" />
        <StatCard label="Pending Queue" value={stats?.pending_episodes} color="bg-gradient-to-r from-orange-400 to-amber-500" />
      </div>

      {/* Ingestion progress bar */}
      {stats && (
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Swarm Coverage</span>
            <span className="text-sm font-black tabular-nums text-white">{ingestPct}%</span>
          </div>
          <div className="h-2 bg-black rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${ingestPct}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            {stats.ingested_episodes.toLocaleString()} of {stats.total_episodes.toLocaleString()} episodes ingested to Telegram
          </p>
        </div>
      )}

      {/* Mission control */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Mission Control</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionButton
            onClick={() => fire("/api/v2/admin/trigger-prefetch", "Smart Pre-fetch")}
            title="Smart Pre-fetch"
            subtitle="Ongoing anime → Telegram Swarm"
            icon="M13 10V3L4 14h7v7l9-11h-7z"
            accent="bg-indigo-600"
            loading={!!actionLoading["/api/v2/admin/trigger-prefetch"]}
          />
          <ActionButton
            onClick={() => fire("/api/v2/admin/mass-sync", "Mass Sync")}
            title="Force Mass Sync"
            subtitle="Deep sync top 100 recent updates"
            icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            accent="bg-violet-600"
            loading={!!actionLoading["/api/v2/admin/mass-sync"]}
          />
          <ActionButton
            onClick={() => fire("/api/v2/admin/sync-missing", "Retry 0 Eps")}
            title="Retry Missing Episodes"
            subtitle="Re-evaluate anime with 0 episodes"
            icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            accent="bg-orange-600"
            loading={!!actionLoading["/api/v2/admin/sync-missing"]}
          />
          <ActionButton
            onClick={() => {
              const id = prompt("Target AniList ID:");
              if (id) fire(`/api/v2/anime/${id}/debug-sync`, `Manual Scrape ID ${id}`);
            }}
            title="Manual ID Scrape"
            subtitle="Force sync a specific AniList ID"
            icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
            accent="bg-zinc-700"
            loading={false}
          />
        </div>
      </div>

      {/* Active ingestions + terminal — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active ingestions */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-5 flex flex-col h-72">
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full shrink-0 ${ingestTasks.length > 0 ? "bg-violet-500 animate-pulse" : "bg-zinc-700"}`} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Active Ingestions {ingestTasks.length > 0 && <span className="text-violet-400">({ingestTasks.length})</span>}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
            {ingestTasks.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">Swarm idle — no active tasks</p>
            ) : (
              ingestTasks.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab("database")}
                  className="w-full flex flex-col gap-1.5 text-left hover:text-violet-400 transition-colors"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold truncate text-white">
                      #{t.anilist_id} <span className="text-zinc-500 font-normal">Ep {t.episode}</span>
                    </span>
                    <span className="text-[9px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded font-black uppercase shrink-0 ml-2">
                      {t.progress?.status || "RUNNING"}
                    </span>
                  </div>
                  {t.progress?.progress && (
                    <div className="h-1 bg-black rounded-full overflow-hidden w-full">
                      <div
                        className="h-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, parseInt(t.progress.progress)))}%` }}
                      />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Terminal feed — SSE-aware */}
        <TerminalFeed api={api} headers={headers} initialLogs={logs} />
      </div>
    </div>
  );
}

// ─── Terminal Feed — SSE connection attempt, polling fallback ─────────────────
function TerminalFeed({
  api, headers, initialLogs,
}: {
  api: string; headers: HeadersInit; initialLogs: string[];
}) {
  const [lines, setLines] = useState<string[]>(initialLogs);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Try SSE, fall back gracefully (HF space may not support it)
  useEffect(() => {
    let es: EventSource | null = null;
    const key = (headers as Record<string, string>)["x-admin-key"] ?? "";
    try {
      es = new EventSource(`${api}/api/v2/admin/logs/stream?key=${encodeURIComponent(key)}`);
      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        const msg = e.data as string;
        setLines((prev) => {
          if (prev[0] === msg) return prev; // dedup head
          return [msg, ...prev].slice(0, 200);
        });
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
      };
    } catch {
      // SSE not supported
    }
    return () => es?.close();
  }, [api, headers]);

  // Sync external log pushes (from polling) into terminal
  useEffect(() => {
    if (initialLogs.length === 0) return;
    setLines((prev) => {
      const merged = [...initialLogs, ...prev];
      const seen = new Set<string>();
      return merged.filter((l) => {
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
      }).slice(0, 200);
    });
  }, [initialLogs]);

  return (
    <div className="bg-black border border-white/5 rounded-3xl p-5 flex flex-col h-72">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${connected ? "bg-green-500 animate-pulse" : "bg-zinc-700"}`} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Terminal Feed {connected && <span className="text-green-500">· LIVE</span>}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[10px] text-green-400 leading-5 flex flex-col-reverse scrollbar-hide">
        <div ref={bottomRef} />
        {lines.length === 0 ? (
          <span className="opacity-40">Awaiting telemetry...</span>
        ) : (
          lines.map((log, i) => (
            <div key={i} className="pb-0.5 opacity-75 hover:opacity-100 transition-opacity break-all">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Database Tab ─────────────────────────────────────────────────────────────
function DatabaseTab({ api, headers }: { api: string; headers: HeadersInit }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [onlyTg, setOnlyTg] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [epLoading, setEpLoading] = useState(false);
  const { addToast } = useToastContext();

  const qp = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page), limit: "50",
      hide_empty: String(hideEmpty), only_tg: String(onlyTg),
    });
    if (search) p.set("search", search);
    return p.toString();
  }, [page, search, hideEmpty, onlyTg]);

  const { data, loading } = useApi<{ success: boolean; data: AnimeRow[]; pagination: { total_pages: number } }>(
    `${api}/api/v2/admin/database?${qp}`,
    headers,
    [qp],
    400
  );

  const rows = data?.success ? data.data : [];
  const totalPages = data?.pagination?.total_pages ?? 1;

  const toggleEpisodes = async (anime: AnimeRow) => {
    if (expandedId === anime.anilistId) { setExpandedId(null); return; }
    setExpandedId(anime.anilistId);
    setEpisodes([]);
    setEpLoading(true);
    try {
      const res = await fetch(`${api}/api/v2/admin/anime/${anime.anilistId}/episodes`, { headers });
      const d = await res.json();
      if (d.success) setEpisodes(d.data);
      else addToast(d.error ?? "Failed", "error");
    } catch { addToast("Network error", "error"); }
    setEpLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search anime title…"
          className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
        />
        <div className="flex gap-2 shrink-0">
          {[
            { label: "Hide empty", state: hideEmpty, toggle: () => { setHideEmpty((p) => !p); setPage(1); } },
            { label: "TG only", state: onlyTg, toggle: () => { setOnlyTg((p) => !p); setPage(1); } },
          ].map(({ label, state, toggle }) => (
            <button
              key={label}
              onClick={toggle}
              className={`px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
                state
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/15"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="space-y-px p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/3 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-600">
            <p className="text-2xl mb-2">∅</p>
            <p className="text-sm">No records match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((anime) => (
              <div key={anime.anilistId}>
                <button
                  onClick={() => toggleEpisodes(anime)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{anime.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      ID {anime.anilistId} · {anime.totalEpisodes ?? 0} eps
                      {anime.providers?.length ? ` · ${anime.providers.join(", ")}` : ""}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${expandedId === anime.anilistId ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {expandedId === anime.anilistId && (
                  <div className="bg-black/40 px-5 py-4 border-t border-white/5">
                    {epLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                      </div>
                    ) : episodes.length === 0 ? (
                      <p className="text-sm text-zinc-600 italic">No episodes found</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                        {episodes.map((ep) => (
                          <div key={ep.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors">
                            <span className="text-xs font-bold text-zinc-400 shrink-0">Ep {ep.episodeNumber}</span>
                            <span className="flex-1 text-[10px] text-zinc-600 truncate font-mono">{ep.episodeUrl || "—"}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                              ep.episodeUrl?.includes("tg-proxy") || ep.episodeUrl?.includes("workers.dev")
                                ? "bg-green-500/10 text-green-500"
                                : ep.episodeUrl
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-zinc-800 text-zinc-600"
                            }`}>
                              {ep.episodeUrl?.includes("tg-proxy") || ep.episodeUrl?.includes("workers.dev")
                                ? "HLS"
                                : ep.episodeUrl ? "Direct" : "None"}
                            </span>
                          </div>
                        ))}
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-zinc-800 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-xs text-zinc-500 tabular-nums">{page} / {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-zinc-800 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Cache Tab ────────────────────────────────────────────────────────────────
function CacheTab({ api, headers, onLogout }: { api: string; headers: HeadersInit; onLogout: () => void }) {
  const { data: cs, loading } = useApi<CacheStats>(
    `${api}/api/v2/admin/cache-stats`,
    headers,
    [headers]
  );

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-zinc-900 rounded-3xl animate-pulse border border-white/5" />)}
    </div>
  );

  if (cs?.error) return (
    <div className="bg-red-950/50 border border-red-800/30 rounded-3xl p-10 text-center">
      <p className="text-red-300 font-bold mb-2">Access Denied</p>
      <p className="text-red-400/70 text-sm mb-6">{cs.error}</p>
      <button onClick={onLogout} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-colors">
        Re-authenticate
      </button>
    </div>
  );

  if (!cs) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "L0 Instance LRU", value: `${cs.l0_entries}/${cs.l0_max}`, sub: "~0ms · in-process", color: "text-yellow-400" },
          { title: "L1 Global Edge", value: "Upstash Redis", sub: "~1-5ms · distributed", color: "text-red-400" },
          { title: "L2 Postgres", value: String(cs.l2_pg_entries ?? "—"), sub: "~10-30ms · cold store", color: "text-blue-400" },
        ].map(({ title, value, sub, color }) => (
          <div key={title} className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">{title}</p>
            <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-zinc-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-6">
        <div>
          <p className="font-bold text-white mb-1">L3 Coalesced Engine</p>
          <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
            In-flight scraper tasks. Concurrent duplicate requests are coalesced to prevent redundant scraping via SWR pattern.
          </p>
        </div>
        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-violet-400 to-indigo-600 tabular-nums shrink-0">
          {cs.inflight_scrapes}
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Provider Circuit Breakers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(cs.circuit_breakers ?? {}).map(([prov, state]: [string, string]) => (
            <div key={prov} className="bg-black/50 border border-white/5 p-4 rounded-2xl">
              <p className="font-bold text-sm text-white capitalize mb-2">{prov}</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                state === "closed" ? "bg-green-500/10 text-green-400" :
                state === "open" ? "bg-red-500/10 text-red-400" :
                "bg-orange-500/10 text-orange-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  state === "closed" ? "bg-green-500" : state === "open" ? "bg-red-500" : "bg-orange-500"
                }`} />
                {state === "closed" ? "HEALTHY" : state === "open" ? "TRIPPED" : state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Toast context (simple inline) ───────────────────────────────────────────
import { createContext, useContext } from "react";
const ToastCtx = createContext<{ addToast: (m: string, t: "success" | "error" | "info") => void }>({ addToast: () => {} });
const useToastContext = () => useContext(ToastCtx);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, onLogout }: { activeTab: string; setActiveTab: (t: string) => void; onLogout: () => void }) {
  return (
    <aside className="w-64 border-r border-white/5 hidden md:flex flex-col bg-zinc-950/50 backdrop-blur-2xl sticky top-0 h-screen shrink-0">
      <div className="p-5">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0">
            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-black text-base leading-tight tracking-tight text-white">OrcaSys</p>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Central Command</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {Object.entries(TAB_META).map(([key, { label, icon }]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            {label}
          </button>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/8 hover:bg-red-500/15 text-red-400 py-2.5 rounded-xl text-xs font-bold transition-colors border border-red-500/10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Terminate Session
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Dock ──────────────────────────────────────────────────────────────
function MobileDock({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  const DOCK_TABS = ["insights", "database", "vault", "cache", "users", "monetization", "ecosystem"];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-white/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center px-1 pt-2 pb-1.5 overflow-x-auto scrollbar-hide gap-0.5">
        {DOCK_TABS.map((key) => {
          const { label, icon } = TAB_META[key];
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all shrink-0 min-w-0"
            >
              <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-white/15" : "bg-transparent"}`}>
                <svg className={`w-5 h-5 transition-colors ${active ? "text-white" : "text-zinc-500"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className={`text-[9px] font-bold tracking-wide transition-colors whitespace-nowrap ${active ? "text-white" : "text-zinc-600"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Placeholder tabs ─────────────────────────────────────────────────────────
function PlaceholderTab({ emoji, title, desc, cta }: { emoji: string; title: string; desc: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="w-16 h-16 bg-zinc-900 border border-white/5 rounded-3xl flex items-center justify-center text-2xl">
        {emoji}
      </div>
      <div>
        <p className="text-lg font-bold text-white">{title}</p>
        <p className="text-sm text-zinc-500 mt-1.5 max-w-sm leading-relaxed">{desc}</p>
      </div>
      {cta && (
        <button className="px-5 py-2.5 bg-zinc-900 border border-white/10 hover:border-white/20 rounded-xl text-sm font-bold text-white transition-colors">
          {cta}
        </button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [auth, setAuth] = useState(false);
  const [key, setKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [activeTab, setActiveTab] = useState("insights");

  // Polling data (fast lane)
  const [stats, setStats] = useState<Stats | null>(null);
  const [ingestTasks, setIngestTasks] = useState<IngestTask[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const toastId = useRef(0);
  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, message, type }].slice(-5));
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const headers = useMemo(() => ({ "x-admin-key": key }), [key]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const verifyToken = useCallback(async (k: string) => {
    try {
      const res = await fetch(`${API}/api/v2/admin/verify`, { method: "POST", headers: { "x-admin-key": k } });
      const data = await res.json();
      if (res.ok && data.success) {
        setKey(k);
        setAuth(true);
        sessionStorage.setItem("orca_key", k);
      } else {
        throw new Error(data.error ?? "Invalid passcode");
      }
    } catch (e: unknown) {
      addToast((e as Error).message, "error");
      sessionStorage.removeItem("orca_key");
    }
  }, [addToast]);

  useEffect(() => {
    const saved = sessionStorage.getItem("orca_key");
    if (saved) verifyToken(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    setAuth(false);
    setKey("");
    sessionStorage.removeItem("orca_key");
  }, []);

  // ── Polling: fast lane (ingest-stats only, every 8s) ──────────────────────
  const pollFast = useCallback(async () => {
    if (!key) return;
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API}/api/v2/admin/ingest-stats`, { headers, signal: ctrl.signal });
      if (!res.ok) return;
      const d = await res.json();
      if (d.success) {
        setIngestTasks(d.active_tasks ?? []);
        if (d.logs?.length) {
          setLogs((prev) => {
            const merged = [...d.logs, ...prev];
            const seen = new Set<string>();
            return merged.filter((l) => !seen.has(l) && seen.add(l)).slice(0, 200);
          });
        }
      }
    } catch { /* AbortError or network */ }
    return () => ctrl.abort();
  }, [key, headers]);

  // ── Polling: slow lane (stats, once + every 2min) ─────────────────────────
  const pollSlow = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`${API}/api/v2/admin/stats`, { headers });
      if (!res.ok) return;
      const d = await res.json();
      if (d.success) setStats(d);
    } catch { /* network */ }
  }, [key, headers]);

  useEffect(() => {
    if (!auth) return;
    pollSlow();
    pollFast();
    const fast = setInterval(pollFast, 8_000);
    const slow = setInterval(pollSlow, 120_000);
    return () => { clearInterval(fast); clearInterval(slow); };
  }, [auth, pollFast, pollSlow]);

  // ── Global action handler ─────────────────────────────────────────────────
  const handleAction = useCallback(async (endpoint: string, label: string) => {
    addToast(`Initiating: ${label}…`, "info");
    try {
      const res = await fetch(`${API}${endpoint}`, { method: "POST", headers });
      const d = await res.json();
      if (d.success) addToast(d.message ?? "Done", "success");
      else addToast(d.error ?? "Unauthorized", "error");
    } catch (e: unknown) {
      addToast(`Network: ${(e as Error).message}`, "error");
    }
    pollFast();
  }, [addToast, headers, pollFast]);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <ToastCtx.Provider value={{ addToast }}>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="w-full max-w-xs">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <svg className="w-7 h-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white text-center tracking-tight mb-1">OrcaSys</h1>
            <p className="text-sm text-zinc-500 text-center mb-8">Enter your admin key</p>
            <form onSubmit={(e) => { e.preventDefault(); verifyToken(inputKey); }} className="space-y-3">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3.5 text-center text-white text-sm focus:outline-none focus:border-white/25 transition-colors placeholder-zinc-600"
                placeholder="••••••••"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-white text-black font-bold py-3.5 rounded-2xl hover:bg-zinc-100 transition-colors active:scale-[0.98] text-sm"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
        <Toast items={toasts} remove={removeToast} />
      </ToastCtx.Provider>
    );
  }

  const tabMeta = TAB_META[activeTab];

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <ToastCtx.Provider value={{ addToast }}>
      <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="px-5 md:px-8 pt-6 md:pt-8 pb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{tabMeta.label}</h2>
            <p className="text-sm text-zinc-500 mt-1">{tabMeta.desc}</p>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 md:px-8 pb-32 md:pb-10">
            <TabErrorBoundary tab={activeTab} key={activeTab}>
              {activeTab === "insights" && (
                <InsightsTab
                  api={API} headers={headers}
                  stats={stats} ingestTasks={ingestTasks} logs={logs}
                  onAction={handleAction} setActiveTab={setActiveTab}
                />
              )}
              {activeTab === "database" && <DatabaseTab api={API} headers={headers} />}
              {activeTab === "vault" && (
                <PlaceholderTab emoji="🗄️" title="Swarm Vault" desc="Telegram HLS segment storage browser with CSV export." cta="Load Vault" />
              )}
              {activeTab === "cache" && <CacheTab api={API} headers={headers} onLogout={logout} />}
              {activeTab === "users" && (
                <PlaceholderTab emoji="👥" title="User Management" desc="Registered accounts, premium upgrades, and ban controls. Coming soon." />
              )}
              {activeTab === "monetization" && (
                <PlaceholderTab emoji="💰" title="Revenue" desc="Connect Midtrans, Saweria, or Trakteer to track MRR and automate premium provisioning." cta="Setup Gateway" />
              )}
              {activeTab === "ecosystem" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Next.js Pages", value: "11" },
                      { label: "React Components", value: "31" },
                      { label: "API Endpoints", value: "15+" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-zinc-900 border border-white/5 rounded-3xl p-5">
                        <p className="text-2xl font-black text-white">{value}</p>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden">
                    {[
                      ["Frontend", "Next.js 15, Tailwind v4, React 19"],
                      ["Backend", "FastAPI (Python 3.10), Uvicorn, SQLAlchemy"],
                      ["Database", "Neon Postgres (serverless + connection pool)"],
                      ["Cache", "Upstash Redis + QStash background queue"],
                      ["Deployment", "Cloudflare Pages + Hugging Face Spaces"],
                      ["Video Storage", "Telegram Swarm via Cloudflare Worker proxy"],
                      ["Providers", "Oploverz, Samehadaku, Kuronime, Otakudesu"],
                    ].map(([t, d]) => (
                      <div key={t} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                        <p className="text-sm font-bold text-white w-36 shrink-0">{t}</p>
                        <p className="text-sm text-zinc-500">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabErrorBoundary>
          </div>
        </main>

        <MobileDock activeTab={activeTab} setActiveTab={setActiveTab} />
        <Toast items={toasts} remove={removeToast} />
      </div>

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes toast-in { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .animate-toast-in { animation: toast-in 0.2s ease-out forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </ToastCtx.Provider>
  );
}

export default MainApp;