'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

import {
  TrendingUp, CheckCircle2, X, ArrowRight, Zap,
  Award, Sparkles, Gift, Clock, CreditCard, AlertTriangle, Smartphone,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { PLANS } from '@/lib/plans';
import { fmt, formatPhone } from '@/lib/format';
import type { Plan, DashboardData } from '@/lib/types';

const PLAN_ICONS: Record<string, typeof TrendingUp> = {
  starter: TrendingUp,
  silver: Award,
  gold: Sparkles,
  premium: Gift,
};

const PLAN_STYLES: Record<string, { color: string; bg: string; border: string; tag: string }> = {
  starter: { color: 'var(--green-600)',  bg: 'var(--green-50)',  border: 'var(--green-100)',  tag: 'Pour débuter'    },
  silver:  { color: 'var(--text-400)',   bg: 'var(--bg-subtle)', border: 'var(--border)',     tag: 'Populaire'       },
  gold:    { color: 'var(--amber-600)',  bg: 'var(--amber-50)',  border: 'var(--amber-100)',  tag: 'Meilleur choix'  },
  premium: { color: 'var(--red-600)',    bg: 'var(--red-50)',    border: 'var(--red-100)',    tag: 'Maximum profit'  },
};

function planFeatures(plan: Plan): string[] {
  return [
    `Dépôt : ${fmt(plan.amount)} FCFA`,
    `Remboursé immédiat : ${fmt(plan.remb)} FCFA`,
    `Gain en 1 mois : +${fmt(plan.gain)} FCFA`,
    'Commission parrainage : 500 FCFA',
  ];
}

/* ── Modale ── */
function InvestModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [step,      setStep]      = useState<'confirm' | 'creating' | 'redirecting' | 'error'>('confirm');
  const [payMethod, setPayMethod] = useState<'flooz' | 'tmoney'>('flooz');
  const [phone,     setPhone]     = useState('');
  const [errorMsg,  setErrorMsg]  = useState('');

  const Icon = PLAN_ICONS[plan.id] || TrendingUp;
  const s = PLAN_STYLES[plan.id];

  const handlePay = async () => {
    if (!phone || phone.length < 8) return;
    setStep('creating');
    try {
      const { payment_url, token } = await api.tchinPay({
        planId: plan.id,
        paymentMethod: payMethod,
        phone,
      });
      setStep('redirecting');
      // Store token so the dashboard can poll for confirmation after redirect
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pendingPaymentToken', token);
      }
      // Small delay so the user sees the "redirecting" message
      await new Promise(r => setTimeout(r, 800));
      window.location.href = payment_url;
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Une erreur est survenue.');
      setStep('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">

        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-900)' }}>
              {step === 'confirm'     && <><div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}><Icon size={15} /></div> Plan {plan.name}</>}
              {step === 'creating'    && <><Clock size={18} style={{ color: 'var(--amber-600)' }} /> Préparation…</>}
              {step === 'redirecting' && <><Clock size={18} style={{ color: 'var(--amber-600)' }} /> Redirection…</>}
              {step === 'error'       && <><AlertTriangle size={18} style={{ color: 'var(--red-600)' }} /> Erreur</>}
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
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: 'var(--r-md)', padding: '16px', marginBottom: '18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-400)' }}>Plan</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: s.color }}>{plan.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '26px', color: 'var(--text-900)', letterSpacing: '-0.5px' }}>{fmt(plan.amount)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-400)', fontWeight: 600 }}>FCFA à déposer</div>
                  </div>
                </div>

                {[
                  { icon: Zap,        label: 'Remboursement immédiat (50%)', val: `+${fmt(plan.remb)} FCFA`,            color: 'var(--green-600)' },
                  { icon: TrendingUp, label: "Gain au bout d'1 mois",        val: `+${fmt(plan.gain)} FCFA`,            color: s.color },
                  { icon: CreditCard, label: 'Total que vous recevez',        val: `${fmt(plan.remb + plan.gain)} FCFA`, color: 'var(--text-900)', bold: true },
                ].map(row => {
                  const R = row.icon;
                  return (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${s.border}` }}>
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
                      border: `1.5px solid ${payMethod === m ? 'var(--primary)' : 'var(--border)'}`,
                      background: payMethod === m ? 'var(--primary-pale)' : 'var(--bg-card)',
                      color: payMethod === m ? 'var(--primary)' : 'var(--text-500)',
                      fontWeight: 700, fontSize: '13px', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.15s',
                      boxShadow: payMethod === m ? '0 0 0 3px rgba(217,119,87,0.12)' : 'none',
                    }}>
                      <Smartphone size={13} />
                      {m === 'flooz' ? 'Flooz (Togocel)' : 'T-Money (Moov)'}
                    </button>
                  ))}
                </div>

                <label className="form-label">Votre numéro {payMethod === 'flooz' ? 'Flooz' : 'T-Money'}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-400)', fontSize: '13px', fontWeight: 600 }}>
                    +228
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

            {/* ETAPE 2 — création du paiement */}
          {step === 'creating' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-pale)', border: '2px solid var(--primary-light)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>Création du paiement…</h3>
              <p style={{ color: 'var(--text-500)', fontSize: '13.5px', lineHeight: 1.6 }}>
                Préparation de votre lien de paiement Mobile Money.
              </p>
              <div style={{ marginTop: '28px', display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {/* ETAPE 3 — redirection */}
          {step === 'redirecting' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-pale)', border: '2px solid var(--primary-light)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '10px' }}>Redirection en cours…</h3>
              <p style={{ color: 'var(--text-500)', fontSize: '13.5px', lineHeight: 1.6 }}>
                Vous allez être redirigé vers la page de paiement sécurisée.<br />
                Confirmez le paiement de <strong style={{ color: 'var(--text-900)' }}>{fmt(plan.amount)} FCFA</strong> sur votre téléphone.
              </p>
              <div style={{ marginTop: '28px', display: 'inline-block', width: '40px', height: '40px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {/* ERREUR */}
          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red-50)', border: '2px solid var(--red-100)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={32} style={{ color: 'var(--red-600)' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red-600)', marginBottom: '8px' }}>Échec de l&apos;investissement</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-400)', marginBottom: '20px' }}>{errorMsg}</p>
              <button className="btn btn-outline" onClick={() => setStep('confirm')} style={{ width: '100%', justifyContent: 'center' }}>
                Réessayer
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
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.dashboard().then((d) => { if (!cancelled) setDashData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="app-layout">
      <Navbar
        userPhone={dashData ? formatPhone(dashData.user.phone) : undefined}
        walletBalance={dashData?.walletBalance}
      />

      <main className="main-content">
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1 className="page-title">
                Investir <TrendingUp size={22} style={{ color: 'var(--primary)' }} />
              </h1>
              <p className="page-subtitle">Choisissez votre plan · 50 % remboursé immédiatement · Mise x2 en 1 mois</p>
            </div>
          </div>

          <div className="plans-grid">
            {PLANS.map((plan, i) => {
              const Icon = PLAN_ICONS[plan.id] || TrendingUp;
              const s = PLAN_STYLES[plan.id];
              return (
                <div
                  key={plan.id}
                  className={`plan-card fade-in-up ${plan.featured ? 'plan-card-featured' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className={`plan-badge plan-badge-${plan.id === 'silver' ? 'silver' : plan.id === 'gold' ? 'gold' : plan.id === 'premium' ? 'premium' : 'starter'}`} />

                  <div className="plan-icon-wrapper" style={{ marginTop: '10px', background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                    <Icon size={22} />
                  </div>

                  <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-400)', marginBottom: '3px' }}>
                    {s.tag}
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
                      <span style={{ fontWeight: 700, color: s.color }}>+{fmt(plan.gain)} FCFA</span>
                    </div>
                    <div className="plan-recap-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)' }}>Total reçu</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-900)' }}>{fmt(plan.remb + plan.gain)} FCFA</span>
                    </div>
                  </div>

                  <div className="plan-features">
                    {planFeatures(plan).map((f, fi) => (
                      <div key={fi} className="plan-feature">
                        <CheckCircle2 size={13} style={{ color: s.color, flexShrink: 0 }} />
                        {f}
                      </div>
                    ))}
                  </div>

                  <button className="plan-btn" style={{ background: s.color }}>
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
