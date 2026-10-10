'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

import {
  TrendingUp, Users, Wallet, Clock, CheckCircle2, ArrowRight, Copy, Zap, CreditCard, User,
} from 'lucide-react';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { formatPhone, formatDate, fmt } from '@/lib/format';
import type { DashboardData } from '@/lib/types';
import { Suspense } from 'react';
import Countdown from '@/components/Countdown';

const planColors: Record<string, string> = {
  Or: 'var(--amber-600)',  Starter: 'var(--green-600)',
  Argent: 'var(--text-400)',       Premium: 'var(--red-600)',
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  // Tchin appends ?status=success&token=… to the return_url automatically
  const [paymentToken, setPaymentToken] = useState<string | null>(
    searchParams.get('token') ?? null
  );
  const [copied,       setCopied]       = useState(false);
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [loadErr,      setLoadErr]      = useState('');
  const [paymentState, setPaymentState] = useState<'pending' | 'confirmed' | 'failed' | null>(
    paymentSuccess ? 'pending' : null
  );

  // Fallback: pick up token from sessionStorage (set before redirect, in case query param is missing)
  useEffect(() => {
    if (!paymentSuccess) return;
    const stored = sessionStorage.getItem('pendingPaymentToken');
    if (stored) {
      sessionStorage.removeItem('pendingPaymentToken');
      setPaymentToken(prev => prev ?? stored);
    }
  }, [paymentSuccess]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.dashboard();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiClientError) setLoadErr(e.message);
          else setLoadErr('Erreur de chargement.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Poll payment status when redirected back from Tchin
  useEffect(() => {
    if (!paymentSuccess || !paymentToken) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 20 × 3 s = 60 s max

    const poll = async () => {
      if (cancelled || attempts >= MAX_ATTEMPTS) {
        if (!cancelled) setPaymentState('failed');
        return;
      }
      attempts++;
      try {
        const { status } = await api.tchinStatus(paymentToken);
        if (cancelled) return;
        if (status === 'completed') {
          setPaymentState('confirmed');
          // Refresh dashboard data to show the new investment
          const d = await api.dashboard();
          if (!cancelled) setData(d);
        } else if (status === 'failed') {
          setPaymentState('failed');
        } else {
          // Still pending — retry in 3 s
          setTimeout(poll, 3000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [paymentSuccess, paymentToken]);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (!data && !loadErr) {
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

  // Error state
  if (loadErr && !data) {
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

  if (!data) return null;

  const displayPhone = formatPhone(data.user.phone);

  return (
    <div className="app-layout">
      <Navbar userPhone={displayPhone} walletBalance={data.walletBalance} />

      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">
                Tableau de bord
              </h1>
              <p className="page-subtitle">Bienvenue ! Voici un résumé de votre activité.</p>
            </div>
            <Link href="/invest" className="btn btn-green">
              <TrendingUp size={15} /> Investir maintenant
            </Link>
          </div>

          {/* ── Banner succès paiement ── */}
          {paymentState === 'pending' && (
            <div className="alert-amber">
              <Clock size={22} style={{ color: 'var(--amber-600)', flexShrink: 0, animation: 'spin 1.5s linear infinite' }} />
              <div>
                <div className="font-black text-base text-amber">Confirmation en cours…</div>
                <div className="text-sm text-secondary mt-3">
                  On attend la confirmation de Tchin. Votre investissement sera activé dans quelques secondes.
                </div>
              </div>
            </div>
          )}
          {paymentState === 'confirmed' && (
            <div className="alert-green">
              <CheckCircle2 size={22} style={{ color: 'var(--green-600)', flexShrink: 0 }} />
              <div>
                <div className="font-black text-base text-green">Paiement confirmé !</div>
                <div className="text-sm text-secondary mt-3">
                  Votre investissement est maintenant actif. Bonne chance !
                </div>
              </div>
            </div>
          )}
          {paymentState === 'failed' && (
            <div className="alert-red">
              <CheckCircle2 size={22} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
              <div>
                <div className="font-black text-base text-red">Paiement non confirmé</div>
                <div className="text-sm text-secondary mt-3">
                  Aucune confirmation reçue de Tchin. Si vous avez payé, contactez le support.
                </div>
              </div>
            </div>
          )}

          {/* ── Stats ── */}
          <div className="stats-grid fade-in-up">

            {/* Solde — card primaire */}
            <div className="stat-card stat-card-primary">
              <div className="stat-icon"><Wallet size={17} /></div>
              <div className="stat-label">Solde disponible</div>
              <div className="stat-value">{fmt(data.walletBalance)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change">Remboursements inclus</span>
            </div>

            <div className="stat-card d1">
              <div className="stat-icon stat-icon-yellow"><TrendingUp size={17} /></div>
              <div className="stat-label">Total investi</div>
              <div className="stat-value">{fmt(data.totalInvested)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change stat-change-up">Doublement en cours</span>
            </div>

            <div className="stat-card d2">
              <div className="stat-icon stat-icon-red"><Users size={17} /></div>
              <div className="stat-label">Gains parrainage</div>
              <div className="stat-value">{fmt(data.referralEarnings)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change" style={{ background: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                {data.referrals.length} filleuls
              </span>
            </div>

            <div className="stat-card d3">
              <div className="stat-icon stat-icon-blue"><Clock size={17} /></div>
              <div className="stat-label">En attente</div>
              <div className="stat-value">{data.pendingReferrals}</div>
              <span className="stat-change" style={{ background: 'var(--violet-100)', color: 'var(--violet-600)' }}>
                Filleuls en cours
              </span>
            </div>

          </div>

          {/* ── Contenu ── */}
          <div className="grid-2" style={{ marginBottom: '20px' }}>

            {/* Investissements */}
            <div className="card fade-in-up d1">
              <div className="section-header">
                <div>
                  <div className="section-title">
                    <TrendingUp size={16} style={{ color: 'var(--green-600)' }} />
                    Mes Investissements
                  </div>
                  <div className="section-subtitle">Progression de vos placements</div>
                </div>
                <Link href="/invest" className="btn btn-outline btn-sm">+ Nouveau</Link>
              </div>

              {data.investments.length === 0 ? (
                <div className="empty-invest-cta">
                  <div className="empty-invest-icon" aria-hidden="true">
                    <TrendingUp size={28} />
                  </div>
                  <p className="empty-invest-title">Votre premier investissement vous attend</p>
                  <p className="empty-invest-desc">
                    Déposez entre 2 000 et 30 000 FCFA. 50 % vous sont remboursés immédiatement, le reste doublé en 30 jours.
                  </p>
                  <div className="empty-invest-mini-stats" aria-label="Résumé des avantages">
                    <div className="empty-invest-mini-stat">50 % remboursé <span>immédiatement</span></div>
                    <div className="empty-invest-mini-stat">Mise <span>× 2</span> en 30 jours</div>
                    <div className="empty-invest-mini-stat"><span>500 FCFA</span> / filleul</div>
                  </div>
                  <Link href="/invest" className="btn btn-green btn-sm">
                    <TrendingUp size={14} aria-hidden="true" /> Choisir un plan
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.investments.map((inv, i) => {
                    const color = planColors[inv.planName] || 'var(--green-600)';
                    const msTotal = new Date(inv.expiresAt).getTime() - new Date(inv.createdAt).getTime();
                    const msLeft  = Math.max(0, new Date(inv.expiresAt).getTime() - Date.now());
                    const progress = inv.status === 'completed' ? 100 : Math.round(((msTotal - msLeft) / msTotal) * 100);
                    return (
                      <div key={i} style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--r-md)',
                        padding: '14px 16px',
                        border: '1px solid var(--border)',
                      }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ color, fontWeight: 800, fontSize: '14px' }}>Plan {inv.planName}</span>
                            <span style={{ color: 'var(--text-400)', fontSize: '11.5px' }}>{formatDate(inv.createdAt)}</span>
                          </div>
                          {inv.status === 'completed'
                            ? <span className="badge badge-paid"><CheckCircle2 size={11} /> Terminé</span>
                            : <span className="badge badge-pending"><Clock size={11} /> En cours</span>
                          }
                        </div>

                        {/* Montants */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-500)', marginBottom: '10px' }}>
                          <span>Dépôt : <strong style={{ color: 'var(--text-900)' }}>{fmt(inv.amount)} FCFA</strong></span>
                          <span>Gain : <strong style={{ color }}>+{fmt(inv.gain)} FCFA</strong></span>
                        </div>

                        {/* Countdown ou message de fin */}
                        {inv.status === 'active' ? (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
                              Temps restant
                            </div>
                            <Countdown expiresAt={inv.expiresAt} color={color} />
                          </div>
                        ) : (
                          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--green-600)', fontWeight: 700 }}>
                            <CheckCircle2 size={14} /> Gain disponible · {fmt(inv.gain)} FCFA
                          </div>
                        )}

                        {/* Barre de progression */}
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-400)', marginTop: '5px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Zap size={11} style={{ color: 'var(--green-600)' }} />
                            Remboursé : {fmt(inv.remb)} FCFA
                          </span>
                          <span style={{ fontWeight: 700 }}>{progress} %</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Parrainage */}
            <div className="card fade-in-up d2">
              <div className="section-header">
                <div>
                  <div className="section-title">
                    <Users size={16} style={{ color: 'var(--amber-600)' }} />
                    Mon Parrainage
                  </div>
                  <div className="section-subtitle">500 FCFA par filleul qui investit</div>
                </div>
              </div>

              {/* Lien */}
              <div className="referral-link-box">
                <span className="referral-link-text">{data.referralLink}</span>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied
                    ? <><CheckCircle2 size={12} /> Copié !</>
                    : <><Copy size={12} /> Copier</>
                  }
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-400)', marginBottom: '16px' }}>
                Code : <strong style={{ color: 'var(--green-600)', letterSpacing: '1px' }}>{data.user.referralCode}</strong>
              </p>

              {/* Mini stats */}
              <div className="referral-stats" style={{ marginBottom: '16px' }}>
                <div className="ref-stat">
                  <div className="ref-stat-value">{data.referrals.length}</div>
                  <div className="ref-stat-label">Filleuls</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-stat-value">{fmt(data.referralEarnings)}</div>
                  <div className="ref-stat-label">FCFA gagnés</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-stat-value">{data.pendingReferrals}</div>
                  <div className="ref-stat-label">En attente</div>
                </div>
              </div>

              {/* Liste filleuls */}
              {data.referrals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-400)', fontSize: '13px' }}>
                  Aucun filleul pour l&apos;instant. Partagez votre lien !
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.referrals.map((ref, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)',
                      padding: '10px 12px', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div className="referral-avatar-circle" style={{ width: '30px', height: '30px' }}>
                          <User size={13} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatPhone(ref.phone)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-400)' }}>{formatDate(ref.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                        <span className="commission-badge-tag" style={{ fontSize: '11px', padding: '1px 6px' }}>
                          +{fmt(ref.commission)} FCFA
                        </span>
                        <span className={`badge ${ref.status === 'paid' ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {ref.status === 'paid' ? 'Payé' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link href="/referral" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}>
                Voir tous mes filleuls <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* ── Comment ça marche ── */}
          <div className="card fade-in-up">
            <div className="section-header">
              <div>
                <div className="section-title">Comment fonctionne votre investissement ?</div>
                <div className="section-subtitle">Le cycle complet en 3 étapes</div>
              </div>
            </div>

            <div className="grid-3">
              {[
                { step: '01', icon: CreditCard, color: 'var(--green-600)', bg: 'var(--green-50)',  border: 'var(--green-100)', title: 'Vous déposez',     desc: 'Choisissez votre plan et payez via Flooz ou Mixx by Yas.', detail: '2 000 à 30 000 FCFA' },
                { step: '02', icon: Zap,        color: 'var(--amber-600)', bg: 'var(--amber-50)',  border: 'var(--amber-100)', title: '50 % remboursé',   desc: 'La moitié de votre dépôt est reversée immédiatement.',  detail: 'Dans les 24 h'     },
                { step: '03', icon: TrendingUp, color: 'var(--primary)',   bg: 'var(--primary-pale)',    border: 'var(--primary-light)',   title: 'Mise x2 en 1 mois', desc: 'Votre dépôt initial vous est rendu en double.',          detail: 'J+30 garanti'      },
              ].map(({ step, icon: Icon, color, bg, border, title, desc, detail }) => (
                <div key={step} className="step-card" style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="step-icon-box" style={{ border: `1px solid ${border}`, color }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="step-number" style={{ color }}> Étape {step}</div>
                      <div className="step-title">{title}</div>
                    </div>
                  </div>
                  <p className="step-desc">{desc}</p>
                  <span className="step-badge" style={{ color, border: `1px solid ${border}` }}>
                    {detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-400)' }}>
            Chargement…
          </div>
        </main>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}