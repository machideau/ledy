'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Copy, CheckCircle2, Share2, Users, TrendingUp, Clock, Gift,
  Smartphone, Globe, MessageSquare, User, Search, Target, DollarSign,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { formatPhone, formatDate, fmt } from '@/lib/format';
import type { ReferralDTO } from '@/lib/types';

const planStyles: Record<string, { bg: string; text: string }> = {
  Starter: { bg: 'var(--green-100)',  text: 'var(--green-600)' },
  Argent:  { bg: 'var(--bg-subtle)',  text: 'var(--text-400)' },
  Or:      { bg: 'var(--amber-100)',  text: 'var(--amber-600)' },
  Premium: { bg: 'var(--red-100)',    text: 'var(--red-600)' },
};

interface ReferralStats {
  total: number;
  totalEarned: number;
  totalPending: number;
  countPaid: number;
  countPending: number;
  commissionPerReferral: number;
}

export default function ReferralPage() {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [referrals, setReferrals] = useState<ReferralDTO[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.referrals();
        setReferrals(data.referrals);
        setStats(data.stats);
        setReferralCode(data.referralCode);
        setReferralLink(data.referralLink);
      } catch (e) {
        if (e instanceof ApiClientError) setLoadErr(e.message);
        else setLoadErr('Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCopy = (type: 'link' | 'code') => {
    navigator.clipboard.writeText(type === 'link' ? referralLink : referralCode);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredReferrals = referrals.filter(ref => {
    const matchesStatus = statusFilter === 'all' || ref.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || ref.phone.toLowerCase().includes(q) || (ref.planName || '').toLowerCase().includes(q) || formatDate(ref.createdAt).toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-400)' }}>
            Chargement…
          </div>
        </main>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--red-600)' }}>
            {loadErr}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">
                Parrainage <Users size={22} style={{ color: 'var(--leed-yellow)' }} />
              </h1>
              <p className="page-subtitle">Partagez votre lien · Gagnez 500 FCFA par filleul qui investit</p>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { icon: Users,       iconClass: 'stat-icon-green',  label: 'Filleuls actifs',      value: String(stats?.total ?? 0), unit: '',     sub: 'Total invités',     subStyle: undefined, filter: 'all' as const },
              { icon: TrendingUp,  iconClass: 'stat-icon-yellow', label: 'Commissions gagnées',  value: fmt(stats?.totalEarned ?? 0), unit: 'FCFA', sub: 'Déjà versé',        subStyle: undefined, filter: 'paid' as const },
              { icon: Clock,       iconClass: 'stat-icon-blue',   label: 'En attente',           value: fmt(stats?.totalPending ?? 0), unit: 'FCFA', sub: 'À recevoir',        subStyle: { background: '#ede9fe', color: '#7c3aed' } as React.CSSProperties, filter: 'pending' as const },
              { icon: Gift,        iconClass: 'stat-icon-red',    label: 'Commission / filleul', value: String(stats?.commissionPerReferral ?? 500), unit: 'FCFA', sub: 'Fixe & garanti',    subStyle: { background: 'var(--leed-yellow-light)', color: 'var(--leed-yellow)' } as React.CSSProperties, filter: null },
            ].map(({ icon: Icon, iconClass, label, value, unit, sub, subStyle, filter }) => (
              <div
                key={label}
                className="stat-card"
                onClick={() => filter && setStatusFilter(filter)}
                style={{ cursor: filter ? 'pointer' : 'default' }}
              >
                <div className={`stat-icon ${iconClass}`}><Icon size={17} /></div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">
                  {value}{unit && <span className="fcfa"> {unit}</span>}
                </div>
                <span className="stat-change stat-change-up" style={subStyle}>{sub}</span>
              </div>
            ))}
          </div>

          {/* ── Lien de parrainage ── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="section-header">
              <div>
                <div className="section-title">Mon Lien de Parrainage</div>
                <div className="section-subtitle">Partagez ce lien sur WhatsApp, Facebook, etc.</div>
              </div>
            </div>

            <div className="grid-2-sm" style={{ marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Lien complet
                </div>
                <div className="referral-link-box" style={{ marginBottom: 0 }}>
                  <span className="referral-link-text">{referralLink}</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy('link')}
                    aria-label={copied === 'link' ? 'Lien copié dans le presse-papier' : 'Copier le lien'}
                  >
                    {copied === 'link'
                      ? <><CheckCircle2 size={12} aria-hidden="true" /> Copié !</>
                      : <><Copy size={12} aria-hidden="true" /> Copier</>
                    }
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  Code de parrainage
                </div>
                <div className="referral-link-box" style={{ marginBottom: 0 }}>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: 'var(--leed-yellow)', letterSpacing: '2px' }}>
                    {referralCode}
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy('code')}
                    aria-label={copied === 'code' ? 'Code copié dans le presse-papier' : 'Copier le code'}
                  >
                    {copied === 'code'
                      ? <><CheckCircle2 size={12} aria-hidden="true" /> Copié !</>
                      : <><Copy size={12} aria-hidden="true" /> Copier</>
                    }
                  </button>
                </div>
              </div>
            </div>
            {/* Announce copy success to screen readers */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {copied === 'link' && 'Lien de parrainage copié dans le presse-papier.'}
              {copied === 'code' && 'Code de parrainage copié dans le presse-papier.'}
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                Partager sur
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { name: 'WhatsApp', icon: Smartphone, color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(`Rejoins LEED Togo et double ton argent en 1 mois !\nCode : ${referralCode}\nLien : ${referralLink}`)}` },
                  { name: 'Facebook', icon: Globe,      color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}` },
                  { name: 'SMS',      icon: MessageSquare, color: '#6366f1', href: `sms:?body=${encodeURIComponent(`LEED Togo : Investis et double en 1 mois ! Code: ${referralCode} - ${referralLink}`)}` },
                ].map(({ name, icon: Icon, color, href }) => (
                  <a
                    key={name} href={href} target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                  >
                    <Icon size={13} /> {name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── Mes Filleuls ── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="referrals-section-header">
              <div>
                <div className="section-title">Mes Filleuls</div>
                <div className="section-subtitle">{referrals.length} personne(s) inscrite(s) via votre lien</div>
              </div>

              <div className="referrals-controls">
                <div className="filter-tabs">
                  <button className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                    Tous <span className="filter-count">{referrals.length}</span>
                  </button>
                  <button className={`filter-tab ${statusFilter === 'paid' ? 'active' : ''}`} onClick={() => setStatusFilter('paid')}>
                    Versés <span className="filter-count">{stats?.countPaid ?? 0}</span>
                  </button>
                  <button className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>
                    En attente <span className="filter-count">{stats?.countPending ?? 0}</span>
                  </button>
                </div>

                <div className="search-box">
                  <Search size={14} className="search-icon" />
                  <input type="text" className="search-input" placeholder="Chercher numéro / plan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>

            {filteredReferrals.length === 0 ? (
              <div className="empty-referrals-box">
                <Users size={32} aria-hidden="true" style={{ margin: '0 auto 8px', opacity: 0.5, color: 'var(--text-400)' }} />
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Aucun filleul trouvé</div>
                <div style={{ fontSize: '12px', color: 'var(--text-500)' }}>
                  {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucun filleul dans cette catégorie.'}
                </div>
                {(searchQuery || statusFilter !== 'all') && (
                  <button className="btn btn-sm btn-outline" style={{ marginTop: '12px' }} onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              /* Unified responsive table — desktop: normal table, mobile: card layout via CSS */
              <div className="referral-table-wrap">
                <table className="referral-table-responsive" aria-label="Liste des filleuls">
                  <thead>
                    <tr>
                      <th scope="col">Numéro</th>
                      <th scope="col">Date</th>
                      <th scope="col">Plan</th>
                      <th scope="col">Montant</th>
                      <th scope="col">Commission</th>
                      <th scope="col">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((ref, i) => {
                      const pStyle = ref.planName
                        ? (planStyles[ref.planName] || { bg: 'var(--bg-subtle)', text: 'var(--text-700)' })
                        : { bg: 'var(--bg-subtle)', text: 'var(--text-700)' };
                      return (
                        <tr key={i}>
                          <td data-label="Numéro">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="referral-avatar-circle" aria-hidden="true"><User size={13} /></div>
                              <span style={{ fontWeight: 600 }}>{formatPhone(ref.phone)}</span>
                            </div>
                          </td>
                          <td data-label="Date" style={{ color: 'var(--text-500)', fontSize: '12px' }}>
                            {formatDate(ref.createdAt)}
                          </td>
                          <td data-label="Plan">
                            {ref.planName
                              ? <span className="plan-badge" style={{ background: pStyle.bg, color: pStyle.text }}>{ref.planName}</span>
                              : <span style={{ color: 'var(--text-400)', fontSize: '12px' }}>—</span>
                            }
                          </td>
                          <td data-label="Montant" style={{ fontWeight: 600 }}>
                            {ref.amount ? `${fmt(ref.amount)} FCFA` : '—'}
                          </td>
                          <td data-label="Commission">
                            <span className="commission-badge-tag">+{fmt(ref.commission)} FCFA</span>
                          </td>
                          <td data-label="Statut">
                            <span className={`badge ${ref.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                              {ref.status === 'paid'
                                ? <><CheckCircle2 size={11} aria-hidden="true" /> Versé</>
                                : <><Clock size={11} aria-hidden="true" /> En attente</>
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Comment ça marche ── */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: '14px' }}>Comment fonctionne le parrainage ?</div>
            <div className="grid-3">
              {[
                { icon: Share2,     step: '1', title: 'Partagez votre lien',   desc: 'Envoyez votre lien via WhatsApp, SMS ou Facebook à vos proches.' },
                { icon: Target,     step: '2', title: 'Votre filleul s\'inscrit', desc: 'Il utilise votre code et souscrit à l\'un des 4 plans d\'investissement.' },
                { icon: DollarSign, step: '3', title: 'Vous recevez 500 FCFA', desc: 'Dès que son premier dépôt est confirmé, 500 FCFA sont crédités sur votre compte.' },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div key={step} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'var(--leed-green-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} style={{ color: 'var(--leed-green)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{step}. {title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
