'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  Users, TrendingUp, ArrowDownToLine, BarChart3,
  CheckCircle2, Clock, XCircle, RefreshCw, Search,
  ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import { ApiClientError } from '@/lib/api';
import { fmt, formatDate, formatPhone } from '@/lib/format';

// ── Types locaux ────────────────────────────────────────────────────────────

interface DouyinStats {
  userCount: number;
  investmentCount: number;
  activeInvestments: number;
  completedInvestments: number;
  withdrawalCount: number;
  pendingWithdrawalCount: number;
  totalInvested: number;
  totalGainsPaid: number;
  totalWithdrawn: number;
  pendingWithdrawalAmount: number;
  totalCommissions: number;
}

interface DouyinUser {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
  investmentCount: number;
  activeInvestments: number;
  totalInvested: number;
  totalGains: number;
  totalRemb: number;
  totalCommissions: number;
  totalWithdrawn: number;
  walletBalance: number;
}

interface DouyinWithdrawal {
  id: string;
  amount: number;
  method: string;
  phone: string;
  status: string;
  type: string;
  ref: string;
  createdAt: string;
  user: { phone: string; name: string | null };
}

interface DouyinInvestment {
  id: string;
  planName: string;
  amount: number;
  remb: number;
  gain: number;
  status: string;
  daysLeft: number;
  expiresAt: string;
  createdAt: string;
  user: { phone: string; name: string | null };
}

type Tab = 'stats' | 'users' | 'withdrawals' | 'investments';

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  Or: 'var(--amber-600)',
  Starter: 'var(--green-600)',
  Argent: 'var(--text-400)',
  Premium: 'var(--red-600)',
};

// ── Composant principal ──────────────────────────────────────────────────────

export default function DouyinPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data
  const [stats, setStats] = useState<DouyinStats | null>(null);
  const [users, setUsers] = useState<DouyinUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<DouyinWithdrawal[]>([]);
  const [investments, setInvestments] = useState<DouyinInvestment[]>([]);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [wdFilter, setWdFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [invFilter, setInvFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Sort
  type SortDir = 'asc' | 'desc';
  const [userSort, setUserSort] = useState<{ key: keyof DouyinUser; dir: SortDir }>({ key: 'createdAt', dir: 'desc' });

  // Withdrawal action state
  const [wdLoading, setWdLoading] = useState<string | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    const data = await apiFetch<DouyinStats>('/api/douyin/stats');
    setStats(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await apiFetch<{ users: DouyinUser[] }>('/api/douyin/users');
    setUsers(data.users);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    const data = await apiFetch<{ withdrawals: DouyinWithdrawal[] }>('/api/douyin/withdrawals');
    setWithdrawals(data.withdrawals);
  }, []);

  const loadInvestments = useCallback(async () => {
    const data = await apiFetch<{ investments: DouyinInvestment[] }>('/api/douyin/investments');
    setInvestments(data.investments);
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadStats(), loadUsers(), loadWithdrawals(), loadInvestments()]);
      } catch (e) {
        if (e instanceof ApiClientError) {
          if (e.status === 403) { router.replace('/dashboard'); return; }
          setError(e.message);
        } else {
          setError('Erreur de chargement.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStats, loadUsers, loadWithdrawals, loadInvestments, router]);

  // ── Withdrawal actions ─────────────────────────────────────────────────────

  const markWithdrawal = async (id: string, status: 'paid' | 'cancelled') => {
    setWdLoading(id);
    try {
      await apiFetch('/api/douyin/withdrawals', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
    } catch (e) {
      alert(e instanceof ApiClientError ? e.message : 'Erreur');
    } finally {
      setWdLoading(null);
    }
  };

  // ── Filtered / sorted data ─────────────────────────────────────────────────

  const filteredUsers = users
    .filter((u) => {
      if (!userSearch) return true;
      const q = userSearch.toLowerCase();
      return (
        u.phone.includes(q) ||
        (u.name ?? '').toLowerCase().includes(q) ||
        u.referralCode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const va = a[userSort.key] ?? '';
      const vb = b[userSort.key] ?? '';
      if (va < vb) return userSort.dir === 'asc' ? -1 : 1;
      if (va > vb) return userSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  const filteredWithdrawals = withdrawals.filter((w) =>
    wdFilter === 'all' ? true : w.status === wdFilter
  );

  const filteredInvestments = investments.filter((inv) =>
    invFilter === 'all' ? true : inv.status === invFilter
  );

  const toggleSort = (key: keyof DouyinUser) => {
    setUserSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (typeof window === 'undefined') return null;

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-400)' }}>
            Chargement du panel…
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="page-container" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--red-600)' }}>
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
                Panel Administration
              </h1>
              <p className="page-subtitle">Vue d&apos;ensemble et gestion de la plateforme LEED Togo.</p>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { loadStats(); loadUsers(); loadWithdrawals(); loadInvestments(); }}
            >
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {([
              { id: 'stats',       label: 'Statistiques',   icon: BarChart3 },
              { id: 'users',       label: `Utilisateurs (${users.length})`, icon: Users },
              { id: 'withdrawals', label: `Retraits (${withdrawals.filter(w => w.status === 'pending').length} en attente)`, icon: ArrowDownToLine },
              { id: 'investments', label: `Investissements (${investments.length})`, icon: TrendingUp },
            ] as { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`nav-item${tab === id ? ' active' : ''}`}
                style={{ cursor: 'pointer', border: 'none', background: tab === id ? undefined : 'var(--bg-card)', borderRadius: 'var(--r-sm)' }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════
              TAB — STATISTIQUES
          ═══════════════════════════════════════ */}
          {tab === 'stats' && stats && (
            <div>
              {/* Grille stats */}
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

              {/* Grille de synthèse financière */}
              <div className="grid-2" style={{ marginBottom: '24px' }}>

                <div className="card">
                  <div className="section-header" style={{ marginBottom: '16px' }}>
                    <div className="section-title"><TrendingUp size={15} style={{ color: 'var(--green-600)' }} /> Investissements</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Total investissements', value: stats.investmentCount, isCount: true },
                      { label: 'Actifs', value: stats.activeInvestments, isCount: true, color: 'var(--primary)' },
                      { label: 'Terminés', value: stats.completedInvestments, isCount: true, color: 'var(--green-600)' },
                      { label: 'Montant total investi', value: stats.totalInvested },
                      { label: 'Gains totaux distribués', value: stats.totalGainsPaid, color: 'var(--amber-600)' },
                    ].map(({ label, value, isCount, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-500)' }}>{label}</span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: color ?? 'var(--text-900)' }}>
                          {isCount ? value : `${fmt(value as number)} FCFA`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="section-header" style={{ marginBottom: '16px' }}>
                    <div className="section-title"><ArrowDownToLine size={15} style={{ color: 'var(--amber-600)' }} /> Retraits & Commissions</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { label: 'Total retraits', value: stats.withdrawalCount, isCount: true },
                      { label: 'Retraits en attente', value: stats.pendingWithdrawalCount, isCount: true, color: 'var(--violet-600)' },
                      { label: 'Montant en attente', value: stats.pendingWithdrawalAmount, color: 'var(--violet-600)' },
                      { label: 'Total retiré (payé)', value: stats.totalWithdrawn, color: 'var(--red-600)' },
                      { label: 'Commissions parrainage', value: stats.totalCommissions, color: 'var(--amber-600)' },
                    ].map(({ label, value, isCount, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-500)' }}>{label}</span>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: color ?? 'var(--text-900)' }}>
                          {isCount ? value : `${fmt(value as number)} FCFA`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB — UTILISATEURS
          ═══════════════════════════════════════ */}
          {tab === 'users' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Header + search */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}>
                  <Users size={15} style={{ color: 'var(--primary)' }} />
                  Utilisateurs inscrits
                </div>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '30px', margin: 0 }}
                    placeholder="Rechercher (tél, nom, code)…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Table desktop */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {([
                        { key: 'phone',        label: 'Téléphone' },
                        { key: 'name',         label: 'Nom' },
                        { key: 'role',         label: 'Rôle' },
                        { key: 'investmentCount', label: 'Invest.' },
                        { key: 'totalInvested',   label: 'Total investi' },
                        { key: 'walletBalance',   label: 'Solde' },
                        { key: 'referralCode', label: 'Code parrain' },
                        { key: 'createdAt',    label: 'Inscription' },
                      ] as { key: keyof DouyinUser; label: string }[]).map(({ key, label }) => (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-500)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {label}
                            {userSort.key === key
                              ? userSort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              : null}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-900)', whiteSpace: 'nowrap' }}>
                          {formatPhone(u.phone)}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-500)' }}>
                          {u.name ?? <span style={{ color: 'var(--text-400)', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge ${u.role === 'douyin' ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: '11px' }}>
                            {u.role === 'douyin' ? <ShieldCheck size={10} /> : null}
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                          {u.investmentCount}
                          {u.activeInvestments > 0 && (
                            <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--primary)' }}>({u.activeInvestments} actif{u.activeInvestments > 1 ? 's' : ''})</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--amber-600)', whiteSpace: 'nowrap' }}>
                          {fmt(u.totalInvested)} FCFA
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          {fmt(u.walletBalance)} FCFA
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--green-600)', fontWeight: 700 }}>
                          {u.referralCode}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>
                          {formatDate(u.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>
                          Aucun utilisateur trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB — RETRAITS
          ═══════════════════════════════════════ */}
          {tab === 'withdrawals' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Header + filter */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}>
                  <ArrowDownToLine size={15} style={{ color: 'var(--amber-600)' }} />
                  Demandes de retrait
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'pending', 'paid'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setWdFilter(f)}
                      className={`btn btn-sm${wdFilter === f ? ' btn-green' : ' btn-outline'}`}
                    >
                      {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Payés'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {['Réf', 'Utilisateur', 'Montant', 'Méthode', 'Téléphone paiement', 'Type', 'Statut', 'Date', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-500)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--green-600)', fontWeight: 700 }}>{w.ref}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-900)' }}>{formatPhone(w.user.phone)}</div>
                          {w.user.name && <div style={{ fontSize: '11.5px', color: 'var(--text-400)' }}>{w.user.name}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          {fmt(w.amount)} FCFA
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge badge-pending" style={{ textTransform: 'uppercase', fontSize: '11px' }}>{w.method}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--text-700)' }}>
                          {formatPhone(w.phone)}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-500)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.type}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge ${w.status === 'paid' ? 'badge-paid' : w.status === 'cancelled' ? '' : 'badge-pending'}`}
                            style={w.status === 'cancelled' ? { background: 'var(--red-50)', color: 'var(--red-600)' } : {}}>
                            {w.status === 'paid' ? <CheckCircle2 size={10} /> : w.status === 'cancelled' ? <XCircle size={10} /> : <Clock size={10} />}
                            {w.status === 'paid' ? 'Payé' : w.status === 'cancelled' ? 'Annulé' : 'En attente'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>
                          {formatDate(w.createdAt)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {w.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                              <button
                                className="btn btn-sm btn-green"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                disabled={wdLoading === w.id}
                                onClick={() => markWithdrawal(w.id, 'paid')}
                              >
                                {wdLoading === w.id ? '…' : <><CheckCircle2 size={11} /> Valider</>}
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--red-600)', borderColor: 'var(--red-100)' }}
                                disabled={wdLoading === w.id}
                                onClick={() => markWithdrawal(w.id, 'cancelled')}
                              >
                                <XCircle size={11} /> Annuler
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredWithdrawals.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>
                          Aucune demande de retrait.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB — INVESTISSEMENTS
          ═══════════════════════════════════════ */}
          {tab === 'investments' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Header + filter */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="section-title" style={{ flex: 1 }}>
                  <TrendingUp size={15} style={{ color: 'var(--green-600)' }} />
                  Tous les investissements
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'active', 'completed'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setInvFilter(f)}
                      className={`btn btn-sm${invFilter === f ? ' btn-green' : ' btn-outline'}`}
                    >
                      {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Terminés'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                      {['Utilisateur', 'Plan', 'Montant', 'Remb. 50%', 'Gain J+30', 'Statut', 'J restants', 'Expiration', 'Date'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-500)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestments.map((inv) => {
                      const color = planColors[inv.planName] ?? 'var(--text-500)';
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-900)' }}>{formatPhone(inv.user.phone)}</div>
                            {inv.user.name && <div style={{ fontSize: '11.5px', color: 'var(--text-400)' }}>{inv.user.name}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 800, color, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                              {inv.planName}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-900)', whiteSpace: 'nowrap' }}>
                            {fmt(inv.amount)} FCFA
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--green-600)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {fmt(inv.remb)} FCFA
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--amber-600)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            +{fmt(inv.gain)} FCFA
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${inv.status === 'completed' ? 'badge-paid' : 'badge-pending'}`}>
                              {inv.status === 'completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {inv.status === 'completed' ? 'Terminé' : 'Actif'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: inv.daysLeft <= 3 ? 'var(--red-600)' : 'var(--text-700)' }}>
                            {inv.status === 'completed' ? '—' : `${inv.daysLeft}j`}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>
                            {formatDate(inv.expiresAt)}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>
                            {formatDate(inv.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredInvestments.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-400)' }}>
                          Aucun investissement trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
