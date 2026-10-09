'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import {
  TrendingUp, Users, Wallet, Clock, CheckCircle2, ArrowRight, Copy, Zap, CreditCard, User,
} from 'lucide-react';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { formatPhone, formatDate, fmt } from '@/lib/format';
import type { DashboardData } from '@/lib/types';
import { Suspense } from 'react';

const planColors: Record<string, string> = {
  Or: 'var(--amber-600)',  Starter: 'var(--green-600)',
  Argent: '#64748b',       Premium: 'var(--red-600)',
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const [copied,  setCopied]  = useState(false);
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loadErr, setLoadErr] = useState('');

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

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render on the server — all data is client-fetched
  if (typeof window === 'undefined') return null;

  // Loading state
  if (!data && !loadErr) {
    return (
      <div className="app-layout">
        <Sidebar />
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
        <Sidebar />
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
      <Sidebar userPhone={displayPhone} walletBalance={data.walletBalance} />

      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">
                Tableau de bord <TogoFlag size={22} />
              </h1>
              <p className="page-subtitle">Bienvenue ! Voici un résumé de votre activité.</p>
            </div>
            <Link href="/invest" className="btn btn-green">
              <TrendingUp size={15} /> Investir maintenant
            </Link>
          </div>

          {/* ── Banner succès paiement ── */}
          {paymentSuccess && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--green-50)', border: '1px solid var(--green-100)',
              borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: '20px',
            }}>
              <CheckCircle2 size={22} style={{ color: 'var(--green-600)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--green-600)' }}>Paiement reçu !</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-500)', marginTop: '2px' }}>
                  Votre investissement sera activé dès confirmation de Tchin (généralement quelques secondes).
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
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-400)', fontSize: '13px' }}>
                  Aucun investissement pour le moment.
                  <div style={{ marginTop: '12px' }}>
                    <Link href="/invest" className="btn btn-green btn-sm">Commencer à investir</Link>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.investments.map((inv, i) => {
                    const progress = inv.status === 'completed' ? 100 : Math.round((1 - inv.daysLeft / 30) * 100);
                    const color = planColors[inv.planName] || 'var(--green-600)';
                    return (
                      <div key={i} style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--r-md)',
                        padding: '14px 16px',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: color, flexShrink: 0,
                            }} />
                            <span style={{ color, fontWeight: 800, fontSize: '14px' }}>Plan {inv.planName}</span>
                            <span style={{ color: 'var(--text-400)', fontSize: '11.5px' }}>{formatDate(inv.createdAt)}</span>
                          </div>
                          <span className={`badge ${inv.status === 'completed' ? 'badge-paid' : 'badge-pending'}`}>
                            {inv.status === 'completed'
                              ? <><CheckCircle2 size={11} /> Terminé</>
                              : <><Clock size={11} /> J-{inv.daysLeft}</>
                            }
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-500)', marginBottom: '10px' }}>
                          <span>Dépôt : <strong style={{ color: 'var(--text-900)' }}>{fmt(inv.amount)} FCFA</strong></span>
                          <span>Gain : <strong style={{ color }}>+{fmt(inv.gain)} FCFA</strong></span>
                        </div>

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
                { step: '01', icon: CreditCard, color: 'var(--green-600)', bg: 'var(--green-50)',  border: 'var(--green-100)', title: 'Vous déposez',     desc: 'Choisissez votre plan et payez via Flooz ou T-Money.', detail: '2 000 à 30 000 FCFA' },
                { step: '02', icon: Zap,        color: 'var(--amber-600)', bg: 'var(--amber-50)',  border: 'var(--amber-100)', title: '50 % remboursé',   desc: 'La moitié de votre dépôt est reversée immédiatement.',  detail: 'Dans les 24 h'     },
                { step: '03', icon: TrendingUp, color: 'var(--red-600)',   bg: 'var(--red-50)',    border: 'var(--red-100)',   title: 'Mise x2 en 1 mois', desc: 'Votre dépôt initial vous est rendu en double.',          detail: 'J+30 garanti'      },
              ].map(({ step, icon: Icon, color, bg, border, title, desc, detail }) => (
                <div key={step} style={{
                  background: bg, border: `1px solid ${border}`,
                  borderRadius: 'var(--r-md)', padding: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: '#fff', border: `1px solid ${border}`,
                      color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color, opacity: 0.7 }}>
                        Étape {step}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-900)' }}>{title}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-500)', lineHeight: 1.6, marginBottom: '8px' }}>{desc}</p>
                  <span style={{ fontSize: '12px', fontWeight: 700, color, background: '#fff', padding: '3px 9px', borderRadius: '20px', border: `1px solid ${border}` }}>
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
        <Sidebar />
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