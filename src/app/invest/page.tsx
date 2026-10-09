'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import {
  TrendingUp, CheckCircle2, X, ArrowRight, Zap, Smartphone,
  Award, Sparkles, Gift, Clock, CreditCard,
} from 'lucide-react';

const PLANS = [
  {
    id: 'starter', name: 'Starter', icon: TrendingUp, amount: 2000,  remb: 1000,  gain: 2000,
    tag: 'Pour débuter',     featured: false,
    accentColor: 'var(--green-600)',  accentBg: 'var(--green-50)',  accentBorder: 'var(--green-100)',
    features: ['Dépôt : 2 000 FCFA', 'Remboursé immédiat : 1 000 FCFA', 'Gain en 1 mois : +2 000 FCFA', 'Commission parrainage : 500 FCFA'],
  },
  {
    id: 'silver',  name: 'Argent',  icon: Award,     amount: 5000,  remb: 2500,  gain: 5000,
    tag: 'Populaire',        featured: false,
    accentColor: '#64748b',           accentBg: '#f8fafc',          accentBorder: '#e2e8f0',
    features: ['Dépôt : 5 000 FCFA', 'Remboursé immédiat : 2 500 FCFA', 'Gain en 1 mois : +5 000 FCFA', 'Commission parrainage : 500 FCFA'],
  },
  {
    id: 'gold',    name: 'Or',      icon: Sparkles,  amount: 15000, remb: 7500,  gain: 15000,
    tag: 'Meilleur choix',   featured: true,
    accentColor: 'var(--amber-600)', accentBg: 'var(--amber-50)',  accentBorder: 'var(--amber-100)',
    features: ['Dépôt : 15 000 FCFA', 'Remboursé immédiat : 7 500 FCFA', 'Gain en 1 mois : +15 000 FCFA', 'Commission parrainage : 500 FCFA'],
  },
  {
    id: 'premium', name: 'Premium', icon: Gift,      amount: 30000, remb: 15000, gain: 30000,
    tag: 'Maximum profit',   featured: false,
    accentColor: 'var(--red-600)',   accentBg: 'var(--red-50)',    accentBorder: 'var(--red-100)',
    features: ['Dépôt : 30 000 FCFA', 'Remboursé immédiat : 15 000 FCFA', 'Gain en 1 mois : +30 000 FCFA', 'Commission parrainage : 500 FCFA'],
  },
];

type Plan = typeof PLANS[number];
function fmt(n: number) { return n.toLocaleString('fr-FR'); }

/* ── Modale ── */
function InvestModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [step,      setStep]      = useState<'confirm' | 'payment' | 'success'>('confirm');
  const [payMethod, setPayMethod] = useState<'flooz' | 'tmoney'>('flooz');
  const [phone,     setPhone]     = useState('');

  const Icon = plan.icon;

  const handlePay = async () => {
    if (!phone || phone.length < 8) return;
    setStep('payment');
    await new Promise(r => setTimeout(r, 1800));
    setStep('success');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">

        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-900)' }}>
              {step === 'confirm' && <><div style={{ width: 28, height: 28, borderRadius: 8, background: plan.accentBg, border: `1px solid ${plan.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.accentColor }}><Icon size={15} /></div> Plan {plan.name}</>}
              {step === 'payment' && <><Clock size={18} style={{ color: 'var(--amber-600)' }} /> Paiement en cours…</>}
              {step === 'success' && <><CheckCircle2 size={18} style={{ color: 'var(--green-600)' }} /> Confirmé !</>}
            </h3>
            {step === 'confirm' && <p style={{ fontSize: '12px', color: 'var(--text-400)', marginTop: '2px' }}>Résumé avant confirmation</p>}
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">

          {/* ETAPE 1 */}
          {step === 'confirm' && (
            <>
              {/* Récap montant */}
              <div style={{
                background: plan.accentBg, border: `1px solid ${plan.accentBorder}`,
                borderRadius: 'var(--r-md)', padding: '16px', marginBottom: '18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${plan.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.accentColor }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-400)' }}>Plan</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: plan.accentColor }}>{plan.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '26px', color: 'var(--text-900)', letterSpacing: '-0.5px' }}>{fmt(plan.amount)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-400)', fontWeight: 600 }}>FCFA à déposer</div>
                  </div>
                </div>

                {[
                  { icon: Zap,        label: 'Remboursement immédiat (50%)', val: `+${fmt(plan.remb)} FCFA`,            color: 'var(--green-600)' },
                  { icon: TrendingUp, label: "Gain au bout d'1 mois",        val: `+${fmt(plan.gain)} FCFA`,            color: plan.accentColor },
                  { icon: CreditCard, label: 'Total que vous recevez',        val: `${fmt(plan.remb + plan.gain)} FCFA`, color: 'var(--text-900)', bold: true },
                ].map(row => {
                  const R = row.icon;
                  return (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${plan.accentBorder}` }}>
                      <span style={{ color: 'var(--text-500)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <R size={13} style={{ color: row.color }} /> {row.label}
                      </span>
                      <span style={{ color: row.color, fontWeight: row.bold ? 800 : 700, fontSize: row.bold ? '14px' : '13px' }}>{row.val}</span>
                    </div>
                  );
                })}
              </div>

              {/* Méthode */}
              <div className="form-group">
                <label className="form-label">Méthode de paiement</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {(['flooz', 'tmoney'] as const).map(m => (
                    <button key={m} onClick={() => setPayMethod(m)} style={{
                      flex: 1, padding: '10px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                      border: `1.5px solid ${payMethod === m ? 'var(--green-600)' : 'var(--border)'}`,
                      background: payMethod === m ? 'var(--green-50)' : '#fff',
                      color: payMethod === m ? 'var(--green-600)' : 'var(--text-500)',
                      fontWeight: 700, fontSize: '13px', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.15s',
                      boxShadow: payMethod === m ? '0 0 0 3px rgba(22,163,74,0.1)' : 'none',
                    }}>
                      <Smartphone size={13} />
                      {m === 'flooz' ? 'Flooz (Togocel)' : 'T-Money (Moov)'}
                    </button>
                  ))}
                </div>

                <label className="form-label">Votre numéro {payMethod === 'flooz' ? 'Flooz' : 'T-Money'}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-400)', fontSize: '13px', fontWeight: 600 }}>
                    <TogoFlag size={13} /> +228
                  </span>
                  <input className="form-input" style={{ paddingLeft: '82px' }} type="tel" placeholder="XX XX XX XX"
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={8} />
                </div>
              </div>

              {/* Info */}
              <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--r-sm)', padding: '10px 13px', fontSize: '12.5px', color: 'var(--text-500)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={13} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
                Remboursement de <strong style={{ color: 'var(--amber-600)' }}>{fmt(plan.remb)} FCFA</strong> versé sous 24 h.
              </div>

              <button className="btn btn-green btn-lg" onClick={handlePay} style={{ width: '100%', justifyContent: 'center' }}>
                Confirmer · {fmt(plan.amount)} FCFA <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* ETAPE 2 */}
          {step === 'payment' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-50)', border: '2px solid var(--green-100)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={28} style={{ color: 'var(--green-600)' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>Vérifiez votre téléphone</h3>
              <p style={{ color: 'var(--text-500)', fontSize: '13.5px', lineHeight: 1.6 }}>
                Une demande de paiement a été envoyée sur le <strong style={{ color: 'var(--text-900)' }}>+228 {phone}</strong>.<br />
                Confirmez le paiement sur votre téléphone.
              </p>
              <div style={{ marginTop: '28px', display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--green-100)', borderTopColor: 'var(--green-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {/* ETAPE 3 */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--green-50)', border: '2px solid var(--green-100)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--green-600)' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green-600)', marginBottom: '6px' }}>Investissement réussi !</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-400)', marginBottom: '20px' }}>Votre placement est maintenant actif.</p>

              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                {[
                  { label: 'Plan souscrit',          val: plan.name,                    color: plan.accentColor },
                  { label: 'Remboursement immédiat', val: `+${fmt(plan.remb)} FCFA`,   color: 'var(--green-600)' },
                  { label: 'Gain à J+30',            val: `+${fmt(plan.gain)} FCFA`,   color: plan.accentColor },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-400)', fontSize: '13px' }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: 800, fontSize: '13.5px' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              <p style={{ color: 'var(--text-400)', fontSize: '12.5px', marginBottom: '18px', lineHeight: 1.6 }}>
                Partagez votre lien de parrainage pour gagner <strong style={{ color: 'var(--amber-600)' }}>500 FCFA</strong> par filleul !
              </p>
              <button className="btn btn-green btn-lg" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
                Voir mon tableau de bord
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function InvestPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <div className="app-layout">
      <Sidebar userPhone="+228 90 12 34 56" walletBalance={9500} />

      <main className="main-content">
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1 className="page-title">
                Investir <TrendingUp size={22} style={{ color: 'var(--green-600)' }} />
              </h1>
              <p className="page-subtitle">Choisissez votre plan · 50 % remboursé immédiatement · Mise x2 en 1 mois</p>
            </div>
          </div>

          <div className="plans-grid">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`plan-card fade-in-up ${plan.featured ? 'plan-card-featured' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className={`plan-badge plan-badge-${plan.id === 'silver' ? 'silver' : plan.id === 'gold' ? 'gold' : plan.id === 'premium' ? 'premium' : 'starter'}`} />

                  <div className="plan-icon-wrapper" style={{ marginTop: '10px', background: plan.accentBg, border: `1px solid ${plan.accentBorder}`, color: plan.accentColor }}>
                    <Icon size={22} />
                  </div>

                  <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-400)', marginBottom: '3px' }}>
                    {plan.tag}
                  </div>
                  <div className="plan-name">Plan {plan.name}</div>
                  <div className="plan-amount">{fmt(plan.amount)}</div>
                  <div className="plan-currency">FCFA</div>

                  <div className="plan-recap">
                    <div className="plan-recap-row">
                      <span>Remboursé immédiat</span>
                      <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>{fmt(plan.remb)} FCFA</span>
                    </div>
                    <div className="plan-recap-row">
                      <span>Gain en 1 mois</span>
                      <span style={{ fontWeight: 700, color: plan.accentColor }}>+{fmt(plan.gain)} FCFA</span>
                    </div>
                    <div className="plan-recap-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)' }}>Total reçu</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-900)' }}>{fmt(plan.remb + plan.gain)} FCFA</span>
                    </div>
                  </div>

                  <div className="plan-features">
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="plan-feature">
                        <CheckCircle2 size={13} style={{ color: plan.accentColor, flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                  </div>

                  <button className="plan-btn" style={{ background: plan.accentColor }}>
                    Investir maintenant <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-400)', fontSize: '12.5px', marginTop: '4px' }}>
            Vous pouvez souscrire à plusieurs plans simultanément pour maximiser vos gains.
          </p>
        </div>
      </main>

      {selectedPlan && <InvestModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </div>
  );
}
