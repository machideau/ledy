'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import {
  TrendingUp, Users, Wallet, Clock, CheckCircle2, ArrowRight, Copy, Zap, CreditCard, User,
} from 'lucide-react';
import Link from 'next/link';

const USER_DATA = {
  phone: '+228 90 12 34 56',
  referralCode: 'LEED-KD7823',
  investments: [
    { plan: 'Or',      amount: 15000, remb: 7500, gain: 15000, date: '09 Sep 2026', daysLeft: 0,  status: 'completed' },
    { plan: 'Starter', amount: 2000,  remb: 1000, gain: 2000,  date: '25 Sep 2026', daysLeft: 16, status: 'active'    },
  ],
  referrals: [
    { phone: '+228 91 XX XX XX', date: '12 Sep 2026', commission: 500, status: 'paid'    },
    { phone: '+228 97 XX XX XX', date: '18 Sep 2026', commission: 500, status: 'paid'    },
    { phone: '+228 93 XX XX XX', date: '01 Oct 2026', commission: 500, status: 'pending' },
  ],
};

const planColors: Record<string, string> = {
  Or: 'var(--amber-600)',  Starter: 'var(--green-600)',
  Argent: '#64748b',       Premium: 'var(--red-600)',
};

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => setMounted(true), []);

  const totalInvested    = USER_DATA.investments.reduce((s, i) => s + i.amount, 0);
  const totalRemb        = USER_DATA.investments.reduce((s, i) => s + i.remb, 0);
  const referralEarnings = USER_DATA.referrals.filter(r => r.status === 'paid').reduce((s, r) => s + r.commission, 0);
  const pending          = USER_DATA.referrals.filter(r => r.status === 'pending').length;
  const walletBalance    = totalRemb + referralEarnings;
  const referralLink     = `https://leed.tg/ref/${USER_DATA.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="app-layout">
      <Sidebar userPhone={USER_DATA.phone} walletBalance={walletBalance} />

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

          {/* ── Stats ── */}
          <div className="stats-grid fade-in-up">

            {/* Solde — card primaire */}
            <div className="stat-card stat-card-primary">
              <div className="stat-icon"><Wallet size={17} /></div>
              <div className="stat-label">Solde disponible</div>
              <div className="stat-value">{fmt(walletBalance)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change">Remboursements inclus</span>
            </div>

            <div className="stat-card d1">
              <div className="stat-icon stat-icon-yellow"><TrendingUp size={17} /></div>
              <div className="stat-label">Total investi</div>
              <div className="stat-value">{fmt(totalInvested)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change stat-change-up">Doublement en cours</span>
            </div>

            <div className="stat-card d2">
              <div className="stat-icon stat-icon-red"><Users size={17} /></div>
              <div className="stat-label">Gains parrainage</div>
              <div className="stat-value">{fmt(referralEarnings)} <span className="fcfa">FCFA</span></div>
              <span className="stat-change" style={{ background: 'var(--amber-100)', color: 'var(--amber-600)' }}>
                {USER_DATA.referrals.length} filleuls
              </span>
            </div>

            <div className="stat-card d3">
              <div className="stat-icon stat-icon-blue"><Clock size={17} /></div>
              <div className="stat-label">En attente</div>
              <div className="stat-value">{pending}</div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {USER_DATA.investments.map((inv, i) => {
                  const progress = inv.status === 'completed' ? 100 : Math.round((1 - inv.daysLeft / 30) * 100);
                  const color = planColors[inv.plan] || 'var(--green-600)';
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
                          <span style={{ color, fontWeight: 800, fontSize: '14px' }}>Plan {inv.plan}</span>
                          <span style={{ color: 'var(--text-400)', fontSize: '11.5px' }}>{inv.date}</span>
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
                <span className="referral-link-text">{referralLink}</span>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied
                    ? <><CheckCircle2 size={12} /> Copié !</>
                    : <><Copy size={12} /> Copier</>
                  }
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-400)', marginBottom: '16px' }}>
                Code : <strong style={{ color: 'var(--green-600)', letterSpacing: '1px' }}>{USER_DATA.referralCode}</strong>
              </p>

              {/* Mini stats */}
              <div className="referral-stats" style={{ marginBottom: '16px' }}>
                <div className="ref-stat">
                  <div className="ref-stat-value">{USER_DATA.referrals.length}</div>
                  <div className="ref-stat-label">Filleuls</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-stat-value">{fmt(referralEarnings)}</div>
                  <div className="ref-stat-label">FCFA gagnés</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-stat-value">{pending}</div>
                  <div className="ref-stat-label">En attente</div>
                </div>
              </div>

              {/* Liste filleuls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {USER_DATA.referrals.map((ref, i) => (
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
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.phone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-400)' }}>{ref.date}</div>
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
