'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Users, TrendingUp, ArrowDownToLine, BarChart3, GitBranch, ScrollText,
  CheckCircle2, Clock, XCircle, RefreshCw, Search,
  ChevronDown, ChevronUp, ShieldCheck, Pencil, Trash2, Save, X as XIcon,
  ChevronLeft, ChevronRight, Download, Ban, UserCheck, Zap,
} from 'lucide-react';
import { ApiClientError } from '@/lib/api';
import { fmt, formatDate, formatPhone } from '@/lib/format';
// #13 — import shared types instead of re-declaring them locally
import type {
  AdminStats as DouyinStats,
  AdminUser as DouyinUser,
  AdminWithdrawal as DouyinWithdrawal,
  AdminInvestment as DouyinInvestment,
  AdminReferral as DouyinReferral,
  AdminLog,
  AdminPagination as Pagination,
  ReferralGlobalStats,
} from '@/lib/types';

type Tab = 'stats' | 'users' | 'withdrawals' | 'investments' | 'referrals' | 'logs';
type SortDir = 'asc' | 'desc';

// ── API helper ────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(data.error ?? 'Erreur serveur', res.status);
  return data as T;
}

const planColors: Record<string, string> = {
  Or: 'var(--amber-600)', Starter: 'var(--green-600)',
  Argent: 'var(--text-400)', Premium: 'var(--red-600)',
};

// ── CSV export helper ─────────────────────────────────────────────────────────

function exportCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines  = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob   = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
}

// ── Pagination bar ─────────────────────────────────────────────────────────────

function PaginationBar({ p, onChange }: { p: Pagination; onChange: (page: number) => void }) {
  if (p.pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-400)' }}>
      <span>{(p.page - 1) * p.limit + 1}–{Math.min(p.page * p.limit, p.total)} sur {p.total}</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button className="btn btn-sm btn-outline" disabled={p.page <= 1} onClick={() => onChange(p.page - 1)} style={{ padding: '4px 8px' }}><ChevronLeft size={14} /></button>
        {Array.from({ length: Math.min(5, p.pages) }, (_, i) => {
          const page = Math.max(1, Math.min(p.pages - 4, p.page - 2)) + i;
          return (
            <button key={page} className={`btn btn-sm ${page === p.page ? 'btn-green' : 'btn-outline'}`}
              style={{ padding: '4px 10px' }} onClick={() => onChange(page)}>{page}</button>
          );
        })}
        <button className="btn btn-sm btn-outline" disabled={p.page >= p.pages} onClick={() => onChange(p.page + 1)} style={{ padding: '4px 8px' }}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

// ── Action label map ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'withdrawal.paid':      { label: 'Retrait approuvé',    color: 'var(--green-600)' },
  'withdrawal.cancelled': { label: 'Retrait refusé',      color: 'var(--red-600)'   },
  'user.suspend':         { label: 'Utilisateur suspendu', color: 'var(--red-600)'  },
  'user.unsuspend':       { label: 'Suspension levée',    color: 'var(--green-600)' },
  'user.delete':          { label: 'Utilisateur supprimé', color: 'var(--red-600)'  },
  'user.edit':            { label: 'Utilisateur modifié', color: 'var(--blue-600)'  },
  'investment.complete':  { label: 'Invest. complété',    color: 'var(--amber-600)' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DouyinPage() {
  const router = useRouter();
  const [tab, setTab]       = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // ── Data state ──
  const [stats, setStats]           = useState<DouyinStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'all' | 'today' | '7d' | '30d'>('all');

  const [users, setUsers]           = useState<DouyinUser[]>([]);
  const [userPage, setUserPage]     = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userPagination, setUserPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });
  const [userSort, setUserSort]     = useState<{ key: keyof DouyinUser; dir: SortDir }>({ key: 'createdAt', dir: 'desc' });

  const [withdrawals, setWithdrawals]     = useState<DouyinWithdrawal[]>([]);
  const [wdPage, setWdPage]               = useState(1);
  const [wdFilter, setWdFilter]           = useState<'all' | 'pending' | 'paid' | 'cancelled'>('pending');
  const [wdSearch, setWdSearch]           = useState('');
  const [wdSort, setWdSort]               = useState<'date' | 'amount'>('date');
  const [wdDir, setWdDir]                 = useState<SortDir>('desc');
  const [wdPagination, setWdPagination]   = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });

  const [investments, setInvestments]     = useState<DouyinInvestment[]>([]);
  const [invPage, setInvPage]             = useState(1);
  const [invFilter, setInvFilter]         = useState<'all' | 'active' | 'completed'>('all');
  const [invPlanFilter, setInvPlanFilter] = useState('all');
  const [invSearch, setInvSearch]         = useState('');
  const [invPagination, setInvPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });

  const [referrals, setReferrals]         = useState<DouyinReferral[]>([]);
  const [refPage, setRefPage]             = useState(1);
  const [refFilter, setRefFilter]         = useState<'all' | 'pending' | 'paid'>('all');
  const [refSearch, setRefSearch]         = useState('');
  const [refPagination, setRefPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });
  const [refGlobalStats, setRefGlobalStats] = useState<ReferralGlobalStats | null>(null);

  const [logs, setLogs]             = useState<AdminLog[]>([]);
  const [logPage, setLogPage]       = useState(1);
  const [logPagination, setLogPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });

  // ── Edit / action state ──
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [editPhone, setEditPhone]   = useState('');
  const [editRole, setEditRole]     = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]   = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [wdLoading, setWdLoading]   = useState<string | null>(null);
  const [wdNoteId, setWdNoteId]     = useState<string | null>(null);
  const [wdNote, setWdNote]         = useState('');

  const [invLoading, setInvLoading] = useState<string | null>(null);
  const [invEditId, setInvEditId]   = useState<string | null>(null);
  const [invEditPlan, setInvEditPlan] = useState('');
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const loadStats = useCallback(async (period = statsPeriod) => {
    const data = await apiFetch<DouyinStats>(`/api/douyin/stats?period=${period}`);
    setStats(data);
  }, [statsPeriod]);

  const loadUsers = useCallback(async (page = userPage, search = userSearch) => {
    const q = new URLSearchParams({ page: String(page), limit: '50', search });
    const data = await apiFetch<{ users: DouyinUser[]; pagination: Pagination }>(`/api/douyin/users?${q}`);
    setUsers(data.users);
    setUserPagination(data.pagination);
  }, [userPage, userSearch]);

  const loadWithdrawals = useCallback(async (page = wdPage, filter = wdFilter, search = wdSearch, sort = wdSort, dir = wdDir) => {
    const q = new URLSearchParams({ page: String(page), limit: '50', status: filter, search, sort, dir });
    const data = await apiFetch<{ withdrawals: DouyinWithdrawal[]; pagination: Pagination }>(`/api/douyin/withdrawals?${q}`);
    setWithdrawals(data.withdrawals);
    setWdPagination(data.pagination);
  }, [wdPage, wdFilter, wdSearch, wdSort, wdDir]);

  const loadInvestments = useCallback(async (page = invPage, filter = invFilter, plan = invPlanFilter, search = invSearch) => {
    const q = new URLSearchParams({ page: String(page), limit: '50', status: filter, plan, search });
    const data = await apiFetch<{ investments: DouyinInvestment[]; pagination: Pagination }>(`/api/douyin/investments?${q}`);
    setInvestments(data.investments);
    setInvPagination(data.pagination);
  }, [invPage, invFilter, invPlanFilter, invSearch]);

  const loadReferrals = useCallback(async (page = refPage, filter = refFilter, search = refSearch) => {
    const q = new URLSearchParams({ page: String(page), limit: '50', status: filter, search });
    const data = await apiFetch<{ referrals: DouyinReferral[]; pagination: Pagination; globalStats: ReferralGlobalStats }>(`/api/douyin/referrals?${q}`);
    setReferrals(data.referrals);
    setRefPagination(data.pagination);
    setRefGlobalStats(data.globalStats);
  }, [refPage, refFilter, refSearch]);

  const loadLogs = useCallback(async (page = logPage) => {
    const q = new URLSearchParams({ page: String(page), limit: '50' });
    const data = await apiFetch<{ logs: AdminLog[]; pagination: Pagination }>(`/api/douyin/logs?${q}`);
    setLogs(data.logs);
    setLogPagination(data.pagination);
  }, [logPage]);

  // ── Initial load ──

  // ── Initial load (#10) — only load stats + pending withdrawals on mount;
  //    other tabs load lazily when first selected ──────────────────────────
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  // Lazy loader: call when switching to a tab for the first time
  const ensureTabLoaded = useCallback(async (t: Tab) => {
    if (loadedTabs.has(t)) return;
    setLoadedTabs(prev => new Set(prev).add(t));
    try {
      if (t === 'stats')       await loadStats();
      if (t === 'users')       await loadUsers();
      if (t === 'withdrawals') await loadWithdrawals();
      if (t === 'investments') await loadInvestments();
      if (t === 'referrals')   await loadReferrals();
      if (t === 'logs')        await loadLogs();
    } catch (e) {
      setLoadedTabs(prev => { const s = new Set(prev); s.delete(t); return s; });
      if (e instanceof ApiClientError) setError(e.message);
    }
  }, [loadedTabs, loadStats, loadUsers, loadWithdrawals, loadInvestments, loadReferrals, loadLogs]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    ensureTabLoaded(t);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Only load the default tab (stats) and pending withdrawals count on mount
        await Promise.all([loadStats(), loadWithdrawals()]);
        setLoadedTabs(new Set(['stats', 'withdrawals'] as Tab[]));
      } catch (e) {
        if (e instanceof ApiClientError) {
          if (e.status === 403) { router.replace('/dashboard'); return; }
          setError(e.message);
        } else setError('Erreur de chargement.');
      } finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Withdrawal actions ────────────────────────────────────────────────────

  const markWithdrawal = async (id: string, status: 'paid' | 'cancelled', note?: string) => {
    setWdLoading(id);
    try {
      await apiFetch('/api/douyin/withdrawals', {
        method: 'PATCH',
        body: JSON.stringify({ id, status, note }),
      });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status, note: note ?? w.note } : w));
      setWdNoteId(null); setWdNote('');
      await Promise.all([loadStats(), loadLogs(1)]);
    } catch (e) { alert(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setWdLoading(null); }
  };

  // ── Investment complete ───────────────────────────────────────────────────

  const completeInvestment = async (id: string) => {
    if (!confirm('Marquer cet investissement comme terminé ?')) return;
    setInvLoading(id);
    try {
      await apiFetch('/api/douyin/investments', { method: 'PATCH', body: JSON.stringify({ id, action: 'complete' }) });
      setInvestments(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'completed', daysLeft: 0 } : inv));
      await Promise.all([loadStats(), loadLogs(1)]);
    } catch (e) { alert(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setInvLoading(null); }
  };

  const changePlan = async (id: string, planName: string) => {
    setInvLoading(id);
    try {
      const updated = await apiFetch<{ id: string; planName: string; amount: number; remb: number; gain: number }>(
        '/api/douyin/investments',
        { method: 'PATCH', body: JSON.stringify({ id, action: 'changePlan', planName }) }
      );
      setInvestments(prev => prev.map(inv =>
        inv.id === id
          ? { ...inv, planName: updated.planName, amount: updated.amount, remb: updated.remb, gain: updated.gain }
          : inv
      ));
      setInvEditId(null);
      await loadLogs(1);
    } catch (e) { alert(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setInvLoading(null); }
  };

  // ── User CRUD + suspend ───────────────────────────────────────────────────

  const startEdit = (u: DouyinUser) => {
    setEditingId(u.id); setEditName(u.name ?? ''); setEditPhone(u.phone); setEditRole(u.role); setEditError('');
  };
  const cancelEdit = () => { setEditingId(null); setEditError(''); };

  const saveEdit = async (id: string) => {
    setEditLoading(true); setEditError('');
    try {
      const updated = await apiFetch<DouyinUser>('/api/douyin/users', {
        method: 'PATCH',
        body: JSON.stringify({ id, name: editName, phone: editPhone, role: editRole }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
      setEditingId(null);
      await loadLogs(1);
    } catch (e) { setEditError(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setEditLoading(false); }
  };

  const toggleSuspend = async (u: DouyinUser) => {
    setSuspendLoading(u.id);
    try {
      await apiFetch('/api/douyin/users', {
        method: 'PATCH',
        body: JSON.stringify({ id: u.id, suspended: !u.suspended }),
      });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, suspended: !x.suspended } : x));
      await loadLogs(1);
    } catch (e) { alert(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setSuspendLoading(null); }
  };

  const deleteUser = async (id: string) => {
    setDeleteLoading(true);
    try {
      await apiFetch('/api/douyin/users', { method: 'DELETE', body: JSON.stringify({ id }) });
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      await Promise.all([loadStats(), loadLogs(1)]);
    } catch (e) { alert(e instanceof ApiClientError ? e.message : 'Erreur'); }
    finally { setDeleteLoading(false); }
  };

  // ── Sorted users (client-side, same page) ────────────────────────────────

  const sortedUsers = [...users].sort((a, b) => {
    const va = a[userSort.key] ?? ''; const vb = b[userSort.key] ?? '';
    if (va < vb) return userSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return userSort.dir === 'asc' ? 1 : -1;
    return 0;
  });
  const toggleSort = (key: keyof DouyinUser) =>
    setUserSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length ||
    (stats?.pendingWithdrawalCount ?? 0);

  // ── CSV exports ───────────────────────────────────────────────────────────

  const exportWithdrawals = () => exportCSV('retraits.csv', withdrawals.map(w => [
    w.ref, formatPhone(w.user.phone), w.user.name ?? '', String(w.amount), w.method, formatPhone(w.phone), w.type, w.status, w.note ?? '', formatDate(w.createdAt),
  ]), ['Réf', 'Utilisateur', 'Nom', 'Montant', 'Méthode', 'N° paiement', 'Type', 'Statut', 'Note', 'Date']);

  const exportUsers = () => exportCSV('utilisateurs.csv', users.map(u => [
    formatPhone(u.phone), u.name ?? '', u.role, u.suspended ? 'Oui' : 'Non', String(u.totalInvested), String(u.walletBalance), u.referralCode, formatDate(u.createdAt),
  ]), ['Téléphone', 'Nom', 'Rôle', 'Suspendu', 'Total investi', 'Solde', 'Code parrain', 'Inscription']);

  const exportInvestments = () => exportCSV('investissements.csv', investments.map(inv => [
    formatPhone(inv.user.phone), inv.user.name ?? '', inv.planName, String(inv.amount), String(inv.remb), String(inv.gain), inv.status, String(inv.daysLeft), formatDate(inv.expiresAt), formatDate(inv.createdAt),
  ]), ['Utilisateur', 'Nom', 'Plan', 'Montant', 'Remb', 'Gain', 'Statut', 'Jours restants', 'Expiration', 'Date']);

  const exportReferrals = () => exportCSV('parrainages.csv', referrals.map(r => [
    formatPhone(r.referrer.phone), r.referrer.name ?? '', r.referrer.referralCode, formatPhone(r.referredPhone), r.planName ?? '', String(r.amount ?? ''), String(r.commission), r.status, formatDate(r.createdAt),
  ]), ['Parrain', 'Nom parrain', 'Code', 'Filleul', 'Plan', 'Montant investi', 'Commission', 'Statut', 'Date']);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="app-layout"><Navbar />
      <main className="main-content">
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-400)' }}>
          Chargement du panel…
        </div>
      </main>
    </div>
  );

  if (error) return (
    <div className="app-layout"><Navbar />
      <main className="main-content">
        <div className="page-container" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--red-600)' }}>{error}</div>
      </main>
    </div>
  );

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-container">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title"><ShieldCheck size={24} style={{ color: 'var(--primary)' }} /> Panel Administration</h1>
              <p className="page-subtitle">Vue d&apos;ensemble et gestion de la plateforme LEED Togo.</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => Promise.all([loadStats(), loadWithdrawals(), ...(loadedTabs.has('users') ? [loadUsers()] : []), ...(loadedTabs.has('investments') ? [loadInvestments()] : []), ...(loadedTabs.has('referrals') ? [loadReferrals()] : []), ...(loadedTabs.has('logs') ? [loadLogs()] : [])])}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>

          {/* Alerte retraits */}
          {(stats?.pendingWithdrawalCount ?? 0) > 0 && (
            <div className="alert-amber" onClick={() => { setTab('withdrawals'); setWdFilter('pending'); }}
              style={{ cursor: 'pointer' }}>
              <Clock size={18} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
              <div className="flex-1">
                <span className="font-black text-base text-amber">
                  {stats!.pendingWithdrawalCount} retrait{stats!.pendingWithdrawalCount > 1 ? 's' : ''} en attente
                </span>
                <span className="text-sm text-secondary" style={{ marginLeft: '8px' }}>
                  · {fmt(stats!.pendingWithdrawalAmount)} FCFA
                </span>
              </div>
              <span className="text-sm text-amber font-bold">Voir →</span>
            </div>
          )}

          {/* Tabs */}
          <div className="admin-tabs" style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {([
              { id: 'stats',       label: 'Statistiques',                     icon: BarChart3       },
              { id: 'users',       label: `Utilisateurs (${userPagination.total || users.length})`, icon: Users },
              { id: 'withdrawals', label: `Retraits${(stats?.pendingWithdrawalCount ?? 0) > 0 ? ` (${stats!.pendingWithdrawalCount} ⚠)` : ''}`, icon: ArrowDownToLine },
              { id: 'investments', label: `Investissements (${invPagination.total || investments.length})`, icon: TrendingUp },
              { id: 'referrals',   label: `Parrainages (${refGlobalStats?.total ?? 0})`, icon: GitBranch },
              { id: 'logs',        label: 'Journal',                           icon: ScrollText      },
            ] as { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={`nav-item${tab === id ? ' active' : ''}`}
                style={{ cursor: 'pointer', border: 'none', background: tab === id ? undefined : 'var(--bg-card)', borderRadius: 'var(--r-sm)', flex: 1 }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════
              TAB STATISTIQUES
          ═══════════════════════════════════════ */}
          {tab === 'stats' && stats && (
            <div>
              {/* Sélecteur période */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {([['all', 'Tout'], ['today', "Aujourd'hui"], ['7d', '7 jours'], ['30d', '30 jours']] as const).map(([p, label]) => (
                  <button key={p} className={`btn btn-sm ${statsPeriod === p ? 'btn-green' : 'btn-outline'}`}
                    onClick={async () => { setStatsPeriod(p); await loadStats(p); }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card stat-card-primary">
                  <div className="stat-icon"><Users size={17} /></div>
                  <div className="stat-label">Utilisateurs</div>
                  <div className="stat-value">{stats.userCount}</div>
                  <span className="stat-change">Inscrits</span>
                </div>
                <div className="stat-card d1">
                  <div className="stat-icon stat-icon-yellow"><TrendingUp size={17} /></div>
                  <div className="stat-label">Total investi</div>
                  <div className="stat-value">{fmt(stats.totalInvested)} <span className="fcfa">FCFA</span></div>
                  <span className="stat-change stat-change-up">{stats.investmentCount} investissements</span>
                </div>
                <div className="stat-card d2">
                  <div className="stat-icon stat-icon-red"><ArrowDownToLine size={17} /></div>
                  <div className="stat-label">Retraits en attente</div>
                  <div className="stat-value">{fmt(stats.pendingWithdrawalAmount)} <span className="fcfa">FCFA</span></div>
                  <span className="stat-change" style={{ background: 'var(--violet-100)', color: 'var(--violet-600)' }}>
                    {stats.pendingWithdrawalCount} demandes
                  </span>
                </div>
                <div className="stat-card d3">
                  <div className="stat-icon stat-icon-blue"><BarChart3 size={17} /></div>
                  <div className="stat-label">Gains distribués</div>
                  <div className="stat-value">{fmt(stats.totalGainsPaid)} <span className="fcfa">FCFA</span></div>
                  <span className="stat-change">{stats.completedInvestments} terminés</span>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="card">
                  <div className="section-title" style={{ marginBottom: '14px' }}><TrendingUp size={15} style={{ color: 'var(--green-600)' }} /> Investissements</div>
                  {[
                    { label: 'Total', value: stats.investmentCount, isCount: true },
                    { label: 'Actifs', value: stats.activeInvestments, isCount: true, color: 'var(--primary)' },
                    { label: 'Terminés', value: stats.completedInvestments, isCount: true, color: 'var(--green-600)' },
                    { label: 'Montant total investi', value: stats.totalInvested },
                    { label: 'Gains distribués', value: stats.totalGainsPaid, color: 'var(--amber-600)' },
                  ].map(({ label, value, isCount, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-500)' }}>{label}</span>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: color ?? 'var(--text-900)' }}>
                        {isCount ? value : `${fmt(value as number)} FCFA`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="section-title" style={{ marginBottom: '14px' }}><ArrowDownToLine size={15} style={{ color: 'var(--amber-600)' }} /> Retraits & Commissions</div>
                  {[
                    { label: 'Total retraits', value: stats.withdrawalCount, isCount: true },
                    { label: 'En attente', value: stats.pendingWithdrawalCount, isCount: true, color: 'var(--violet-600)' },
                    { label: 'Montant en attente', value: stats.pendingWithdrawalAmount, color: 'var(--violet-600)' },
                    { label: 'Total retiré (payé)', value: stats.totalWithdrawn, color: 'var(--red-600)' },
                    { label: 'Commissions parrainage', value: stats.totalCommissions, color: 'var(--amber-600)' },
                  ].map(({ label, value, isCount, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-500)' }}>{label}</span>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: color ?? 'var(--text-900)' }}>
                        {isCount ? value : `${fmt(value as number)} FCFA`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Répartition par plan */}
              {stats.planBreakdown.length > 0 && (
                <div className="card">
                  <div className="section-title" style={{ marginBottom: '14px' }}><GitBranch size={15} /> Répartition par plan</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-subtle)' }}>
                          {['Plan', 'Investissements', 'Total investi', 'Gains potentiels'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.planBreakdown.map(p => (
                          <tr key={p.planName} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: planColors[p.planName] ?? 'var(--text-900)' }}>{p.planName}</td>
                            <td style={{ padding: '10px 14px' }}>{p.count}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmt(p.totalInvested)} FCFA</td>
                            <td style={{ padding: '10px 14px', color: 'var(--amber-600)', fontWeight: 700 }}>{fmt(p.totalGain)} FCFA</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════
              TAB UTILISATEURS
          ═══════════════════════════════════════ */}
          {tab === 'users' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}><Users size={15} style={{ color: 'var(--primary)' }} /> Utilisateurs inscrits</div>
                <div style={{ position: 'relative', minWidth: '200px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }} />
                  <input className="form-input" style={{ paddingLeft: '30px', margin: 0 }} placeholder="Rechercher…"
                    value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                    onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch)} />
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => loadUsers(1, userSearch)}><Search size={12} /></button>
                <button className="btn btn-sm btn-outline" onClick={exportUsers}><Download size={12} /> CSV</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {([
                        { key: 'phone',        label: 'Téléphone' },
                        { key: 'name',         label: 'Nom' },
                        { key: 'role',         label: 'Rôle' },
                        { key: 'totalInvested', label: 'Investi' },
                        { key: 'walletBalance', label: 'Solde réel' },
                        { key: 'referralCode', label: 'Code' },
                        { key: 'createdAt',    label: 'Inscription' },
                      ] as { key: keyof DouyinUser; label: string }[]).map(({ key, label }) => (
                        <th key={key} onClick={() => toggleSort(key)}
                          style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {label}
                            {userSort.key === key ? (userSort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                          </span>
                        </th>
                      ))}
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-400)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(u => {
                      const isEditing = editingId === u.id;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'var(--primary-pale)' : u.suspended ? 'var(--red-50)' : undefined }}
                          onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                          onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = u.suspended ? 'var(--red-50)' : ''; }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {isEditing
                              ? <input className="form-input" style={{ margin: 0, padding: '5px 8px', width: '110px' }} value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))} maxLength={8} />
                              : <span style={{ color: u.suspended ? 'var(--red-600)' : 'var(--text-900)' }}>{formatPhone(u.phone)}</span>}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-500)' }}>
                            {isEditing
                              ? <input className="form-input" style={{ margin: 0, padding: '5px 8px', width: '130px' }} placeholder="Nom" value={editName} onChange={e => setEditName(e.target.value)} />
                              : u.name ?? <span style={{ color: 'var(--text-400)', fontStyle: 'italic' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {isEditing
                              ? <select className="form-input" style={{ margin: 0, padding: '5px 8px', width: '90px' }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                                  <option value="user">user</option>
                                  <option value="douyin">douyin</option>
                                </select>
                              : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span className={`badge ${u.role === 'douyin' ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: '12px' }}>
                                    {u.role === 'douyin' && <ShieldCheck size={10} />} {u.role}
                                  </span>
                                  {u.suspended && <span className="badge" style={{ background: 'var(--red-100)', color: 'var(--red-600)', fontSize: '11px' }}><Ban size={9} /> Suspendu</span>}
                                </span>}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber-600)', whiteSpace: 'nowrap' }}>{fmt(u.totalInvested)} FCFA</td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{fmt(u.walletBalance)} FCFA</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--green-600)', fontWeight: 700 }}>{u.referralCode}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {isEditing
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {editError && <div style={{ fontSize: '12px', color: 'var(--red-600)' }}>{editError}</div>}
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-sm btn-green" style={{ padding: '4px 10px' }} disabled={editLoading} onClick={() => saveEdit(u.id)}>
                                      <Save size={11} /> {editLoading ? '…' : 'OK'}
                                    </button>
                                    <button className="btn btn-sm btn-outline" style={{ padding: '4px 10px' }} onClick={cancelEdit}><XIcon size={11} /></button>
                                  </div>
                                </div>
                              : <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                  <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }} onClick={() => startEdit(u)}><Pencil size={11} /></button>
                                  <button className={`btn btn-sm btn-outline`}
                                    style={{ padding: '4px 8px', color: u.suspended ? 'var(--green-600)' : 'var(--amber-600)', borderColor: u.suspended ? 'var(--green-100)' : 'var(--amber-100)' }}
                                    disabled={suspendLoading === u.id} onClick={() => toggleSuspend(u)}
                                    title={u.suspended ? 'Lever la suspension' : 'Suspendre'}>
                                    {suspendLoading === u.id ? '…' : u.suspended ? <UserCheck size={11} /> : <Ban size={11} />}
                                  </button>
                                  {deleteConfirm === u.id
                                    ? <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'var(--red-600)', color: '#fff', border: 'none' }}
                                          disabled={deleteLoading} onClick={() => deleteUser(u.id)}>{deleteLoading ? '…' : 'Oui'}</button>
                                        <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }} onClick={() => setDeleteConfirm(null)}>Non</button>
                                      </div>
                                    : <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px', color: 'var(--red-600)', borderColor: 'var(--red-100)' }}
                                        onClick={() => setDeleteConfirm(u.id)}><Trash2 size={11} /></button>}
                                </div>}
                          </td>
                        </tr>
                      );
                    })}
                    {sortedUsers.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>Aucun utilisateur trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar p={userPagination} onChange={p => { setUserPage(p); loadUsers(p, userSearch); }} />
            </div>
          )}

          {/* ══════════════════════════════════════
              TAB RETRAITS
          ═══════════════════════════════════════ */}
          {tab === 'withdrawals' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}><ArrowDownToLine size={15} style={{ color: 'var(--amber-600)' }} /> Demandes de retrait</div>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }} />
                  <input className="form-input" style={{ paddingLeft: '30px', margin: 0, width: '180px' }} placeholder="Réf ou numéro…"
                    value={wdSearch} onChange={e => setWdSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadWithdrawals(1, wdFilter, wdSearch, wdSort, wdDir)} />
                </div>
                {/* Filtre statut */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {([['pending', `En attente (${stats?.pendingWithdrawalCount ?? ''})`], ['all', 'Tous'], ['paid', 'Payés'], ['cancelled', 'Annulés']] as const).map(([f, label]) => (
                    <button key={f} className={`btn btn-sm ${wdFilter === f ? 'btn-green' : 'btn-outline'}`}
                      onClick={() => { setWdFilter(f); loadWithdrawals(1, f, wdSearch, wdSort, wdDir); }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Tri */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className={`btn btn-sm ${wdSort === 'date' ? 'btn-green' : 'btn-outline'}`}
                    onClick={() => { const d = wdSort === 'date' ? (wdDir === 'desc' ? 'asc' : 'desc') : 'desc'; setWdSort('date'); setWdDir(d); loadWithdrawals(1, wdFilter, wdSearch, 'date', d); }}>
                    Date {wdSort === 'date' ? (wdDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                  <button className={`btn btn-sm ${wdSort === 'amount' ? 'btn-green' : 'btn-outline'}`}
                    onClick={() => { const d = wdSort === 'amount' ? (wdDir === 'desc' ? 'asc' : 'desc') : 'desc'; setWdSort('amount'); setWdDir(d); loadWithdrawals(1, wdFilter, wdSearch, 'amount', d); }}>
                    Montant {wdSort === 'amount' ? (wdDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </div>
                <button className="btn btn-sm btn-outline" onClick={exportWithdrawals}><Download size={12} /> CSV</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {['Réf', 'Utilisateur', 'Montant', 'Méthode', 'N° paiement', 'Type', 'Statut', 'Note', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)', background: w.status === 'pending' ? 'var(--amber-50)' : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = w.status === 'pending' ? 'var(--amber-50)' : '')}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--green-600)', fontWeight: 700 }}>{w.ref}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-900)' }}>{formatPhone(w.user.phone)}</div>
                          {w.user.name && <div style={{ fontSize: '12px', color: 'var(--text-400)' }}>{w.user.name}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{fmt(w.amount)} FCFA</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: '12px' }}>{w.method}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-700)' }}>{formatPhone(w.phone)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-500)', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.type}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge"
                            style={w.status === 'paid' ? { background: 'var(--green-100)', color: 'var(--green-600)' }
                              : w.status === 'cancelled' ? { background: 'var(--red-50)', color: 'var(--red-600)' }
                              : { background: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                            {w.status === 'paid' ? <CheckCircle2 size={10} /> : w.status === 'cancelled' ? <XCircle size={10} /> : <Clock size={10} />}
                            {w.status === 'paid' ? 'Payé' : w.status === 'cancelled' ? 'Annulé' : 'En attente'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-400)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {w.note ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(w.createdAt)}</td>
                        <td style={{ padding: '10px 14px', minWidth: '200px' }}>
                          {w.status === 'pending' && (
                            wdNoteId === w.id
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <input className="form-input" style={{ margin: 0, padding: '5px 8px', fontSize: '13px' }}
                                    placeholder="Raison du refus…" value={wdNote} onChange={e => setWdNote(e.target.value)} />
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'var(--red-600)', color: '#fff', border: 'none', fontSize: '12px' }}
                                      disabled={wdLoading === w.id} onClick={() => markWithdrawal(w.id, 'cancelled', wdNote)}>
                                      {wdLoading === w.id ? '…' : 'Confirmer'}
                                    </button>
                                    <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setWdNoteId(null); setWdNote(''); }}>Annuler</button>
                                  </div>
                                </div>
                              : <div style={{ display: 'flex', gap: '6px' }}>
                                  <button className="btn btn-sm btn-green" style={{ padding: '4px 10px', fontSize: '13px' }}
                                    disabled={wdLoading === w.id} onClick={() => markWithdrawal(w.id, 'paid')}>
                                    {wdLoading === w.id ? '…' : <><CheckCircle2 size={11} /> Approuver</>}
                                  </button>
                                  <button className="btn btn-sm btn-outline" style={{ padding: '4px 10px', fontSize: '13px', color: 'var(--red-600)', borderColor: 'var(--red-100)' }}
                                    onClick={() => { setWdNoteId(w.id); setWdNote(''); }}>
                                    <XCircle size={11} /> Refuser
                                  </button>
                                </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {withdrawals.length === 0 && (
                      <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>Aucune demande de retrait.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar p={wdPagination} onChange={p => { setWdPage(p); loadWithdrawals(p, wdFilter, wdSearch, wdSort, wdDir); }} />
            </div>
          )}

          {/* ══════════════════════════════════════
              TAB INVESTISSEMENTS
          ═══════════════════════════════════════ */}
          {tab === 'investments' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}><TrendingUp size={15} style={{ color: 'var(--green-600)' }} /> Tous les investissements</div>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }} />
                  <input className="form-input" style={{ paddingLeft: '30px', margin: 0, width: '160px' }} placeholder="N° téléphone…"
                    value={invSearch} onChange={e => setInvSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadInvestments(1, invFilter, invPlanFilter, invSearch)} />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['all', 'active', 'completed'] as const).map(f => (
                    <button key={f} className={`btn btn-sm ${invFilter === f ? 'btn-green' : 'btn-outline'}`}
                      onClick={() => { setInvFilter(f); loadInvestments(1, f, invPlanFilter, invSearch); }}>
                      {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Terminés'}
                    </button>
                  ))}
                </div>
                <select className="form-input" style={{ margin: 0, padding: '6px 10px', width: 'auto' }}
                  value={invPlanFilter} onChange={e => { setInvPlanFilter(e.target.value); loadInvestments(1, invFilter, e.target.value, invSearch); }}>
                  <option value="all">Tous les plans</option>
                  {['Starter', 'Argent', 'Or', 'Premium'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button className="btn btn-sm btn-outline" onClick={exportInvestments}><Download size={12} /> CSV</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {['Utilisateur', 'Plan', 'Montant', 'Remb. 50%', 'Gain J+30', 'Statut', 'Jours restants', 'Expiration', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map(inv => {
                      const color = planColors[inv.planName] ?? 'var(--text-500)';
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700 }}>{formatPhone(inv.user.phone)}</div>
                            {inv.user.name && <div style={{ fontSize: '12px', color: 'var(--text-400)' }}>{inv.user.name}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                              {inv.planName}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(inv.amount)} FCFA</td>
                          <td style={{ padding: '10px 14px', color: 'var(--green-600)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(inv.remb)} FCFA</td>
                          <td style={{ padding: '10px 14px', color: 'var(--amber-600)', fontWeight: 700, whiteSpace: 'nowrap' }}>+{fmt(inv.gain)} FCFA</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${inv.status === 'completed' ? 'badge-paid' : 'badge-pending'}`}>
                              {inv.status === 'completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {inv.status === 'completed' ? 'Terminé' : 'Actif'}
                            </span>
                          </td>
                          {/* #13 — daysLeft calculé live depuis expiresAt */}
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: inv.status === 'completed' ? 'var(--text-400)' : inv.daysLeft <= 3 ? 'var(--red-600)' : 'var(--text-700)' }}>
                            {inv.status === 'completed' ? '—' : `${inv.daysLeft}j`}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(inv.expiresAt)}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(inv.createdAt)}</td>
                          <td style={{ padding: '10px 14px', minWidth: '210px' }}>
                            {inv.status === 'active' && (
                              invEditId === inv.id
                                ? <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                      className="form-input"
                                      style={{ margin: 0, padding: '4px 8px', width: 'auto', fontSize: '13px' }}
                                      value={invEditPlan}
                                      onChange={e => setInvEditPlan(e.target.value)}
                                    >
                                      {['Starter', 'Argent', 'Or', 'Premium'].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </select>
                                    <button
                                      className="btn btn-sm btn-green"
                                      style={{ padding: '4px 10px', fontSize: '12px' }}
                                      disabled={invLoading === inv.id}
                                      onClick={() => changePlan(inv.id, invEditPlan)}
                                    >
                                      {invLoading === inv.id ? '…' : <><Save size={11} /> OK</>}
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline"
                                      style={{ padding: '4px 8px', fontSize: '12px' }}
                                      onClick={() => setInvEditId(null)}
                                    >
                                      <XIcon size={11} />
                                    </button>
                                  </div>
                                : <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      className="btn btn-sm btn-outline"
                                      style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                                      onClick={() => { setInvEditId(inv.id); setInvEditPlan(inv.planName); }}
                                      title="Changer le plan"
                                    >
                                      <Pencil size={11} /> Plan
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline"
                                      style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--green-600)', borderColor: 'var(--green-100)' }}
                                      disabled={invLoading === inv.id}
                                      onClick={() => completeInvestment(inv.id)}
                                    >
                                      {invLoading === inv.id ? '…' : <><Zap size={11} /> Compléter</>}
                                    </button>
                                  </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {investments.length === 0 && (
                      <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>Aucun investissement trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar p={invPagination} onChange={p => { setInvPage(p); loadInvestments(p, invFilter, invPlanFilter, invSearch); }} />
            </div>
          )}

          {/* ══════════════════════════════════════
              TAB PARRAINAGES
          ═══════════════════════════════════════ */}
          {tab === 'referrals' && (
            <div>
              {/* Stats globales */}
              {refGlobalStats && (
                <div className="stats-grid" style={{ marginBottom: '20px' }}>
                  {[
                    { label: 'Total parrainages', value: refGlobalStats.total, suffix: '', color: 'var(--text-900)' },
                    { label: 'Commissions payées', value: refGlobalStats.paidCount, suffix: '', color: 'var(--green-600)' },
                    { label: 'Total commissions', value: fmt(refGlobalStats.totalCommission), suffix: ' FCFA', color: 'var(--amber-600)' },
                    { label: 'Taux de conversion', value: refGlobalStats.conversionRate, suffix: ' %', color: 'var(--primary)' },
                  ].map(({ label, value, suffix, color }) => (
                    <div key={label} className="stat-card">
                      <div className="stat-label">{label}</div>
                      <div className="stat-value" style={{ color }}>{value}{suffix}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="section-title" style={{ flex: 1 }}><GitBranch size={15} style={{ color: 'var(--amber-600)' }} /> Liste des parrainages</div>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }} />
                    <input className="form-input" style={{ paddingLeft: '30px', margin: 0, width: '180px' }} placeholder="Numéro…"
                      value={refSearch} onChange={e => setRefSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadReferrals(1, refFilter, refSearch)} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['all', 'pending', 'paid'] as const).map(f => (
                      <button key={f} className={`btn btn-sm ${refFilter === f ? 'btn-green' : 'btn-outline'}`}
                        onClick={() => { setRefFilter(f); loadReferrals(1, f, refSearch); }}>
                        {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Payés'}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={exportReferrals}><Download size={12} /> CSV</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '750px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                        {['Parrain', 'Code', 'Filleul', 'Plan souscrit', 'Montant investi', 'Commission', 'Statut', 'Date'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700 }}>{formatPhone(r.referrer.phone)}</div>
                            {r.referrer.name && <div style={{ fontSize: '12px', color: 'var(--text-400)' }}>{r.referrer.name}</div>}
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--green-600)', fontWeight: 700 }}>{r.referrer.referralCode}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-700)' }}>{formatPhone(r.referredPhone)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {r.planName
                              ? <span style={{ fontWeight: 700, color: planColors[r.planName] ?? 'var(--text-900)' }}>{r.planName}</span>
                              : <span style={{ color: 'var(--text-400)', fontStyle: 'italic' }}>Pas encore</span>}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber-600)', whiteSpace: 'nowrap' }}>
                            {r.amount ? `${fmt(r.amount)} FCFA` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--green-600)', whiteSpace: 'nowrap' }}>+{fmt(r.commission)} FCFA</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${r.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                              {r.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {r.status === 'paid' ? 'Payé' : 'En attente'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                        </tr>
                      ))}
                      {referrals.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>Aucun parrainage trouvé.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationBar p={refPagination} onChange={p => { setRefPage(p); loadReferrals(p, refFilter, refSearch); }} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              TAB JOURNAL D'AUDIT
          ═══════════════════════════════════════ */}
          {tab === 'logs' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="section-title" style={{ flex: 1 }}><ScrollText size={15} /> Journal des actions admin</div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Admin', 'Action', 'Cible', 'Détails'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => {
                      const actionInfo = ACTION_LABELS[l.action] ?? { label: l.action, color: 'var(--text-500)' };
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>{formatDate(l.createdAt)}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{formatPhone(l.admin.phone)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className="badge" style={{ background: `${actionInfo.color}18`, color: actionInfo.color, fontWeight: 700 }}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-700)' }}>
                            {l.target ? formatPhone(l.target.phone) : l.targetId ? `#${l.targetId.slice(0, 8)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-400)', maxWidth: '200px' }}>
                            {l.meta
                              ? Object.entries(l.meta).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join(' · ')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>Aucune action enregistrée.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar p={logPagination} onChange={p => { setLogPage(p); loadLogs(p); }} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
