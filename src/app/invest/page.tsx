'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

import {
  TrendingUp, CheckCircle2, ArrowRight, Zap,
  Award, Sparkles, Gift, AlertTriangle, Loader2,
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
  /* Premium uses violet — not red — to avoid confusion with errors */
  premium: { color: 'var(--violet-600)', bg: 'var(--violet-50)', border: 'var(--violet-100)', tag: 'Maximum profit'  },
};

function planFeatures(plan: Plan): string[] {
  return [
    `Dépôt : ${fmt(plan.amount)} FCFA`,
    `Remboursé immédiat : ${fmt(plan.remb)} FCFA`,
    `Gain en 1 mois : +${fmt(plan.gain)} FCFA`,
    'Commission parrainage : 500 FCFA',
  ];
}

/* ── Page principale ── */
export default function InvestPage() {
  const [dashData,  setDashData]  = useState<DashboardData | null>(null);
  // planId en cours de chargement, ou null
  const [loading,   setLoading]   = useState<string | null>(null);
  const [errorMsg,  setErrorMsg]  = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    api.dashboard().then((d) => { if (!cancelled) setDashData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handlePlan = async (plan: Plan) => {
    if (loading) return; // already processing one
    setLoading(plan.id);
    setErrorMsg('');
    try {
      const { payment_url, token } = await api.tchinPay({ planId: plan.id });
      // Fallback : stocker le token au cas où Tchin ne le passe pas dans l'URL de retour
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pendingPaymentToken', token);
      }
      window.location.href = payment_url;
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Une erreur est survenue.');
      setLoading(null);
    }
  };

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

          {errorMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--red-50)', border: '1px solid var(--red-100)',
              borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: '20px',
            }}>
              <AlertTriangle size={18} style={{ color: 'var(--red-600)', flexShrink: 0 }} />
              <span style={{ fontSize: '13.5px', color: 'var(--red-600)', fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          <div className="plans-grid">
            {PLANS.map((plan, i) => {
              const Icon = PLAN_ICONS[plan.id] || TrendingUp;
              const s = PLAN_STYLES[plan.id];
              const isLoading = loading === plan.id;
              const isActive = dashData?.investments.some(
                inv => inv.planName.toLowerCase() === plan.name.toLowerCase() && inv.status === 'active'
              ) ?? false;
              return (
                <div
                  key={plan.id}
                  className={`plan-card fade-in-up ${plan.featured ? 'plan-card-featured' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s`, opacity: loading && !isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}
                  onClick={() => handlePlan(plan)}
                >
                  {/* Active indicator badge */}
                  {isActive && (
                    <span className="plan-active-badge" aria-label="Plan actif">
                      <CheckCircle2 size={10} aria-hidden="true" /> Actif
                    </span>
                  )}

                  <div className={`plan-badge plan-badge-${plan.id === 'silver' ? 'silver' : plan.id === 'gold' ? 'gold' : plan.id === 'premium' ? 'premium' : 'starter'}`} aria-hidden="true" />

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

                  <button
                    className="plan-btn"
                    style={{ background: s.color, opacity: isLoading ? 0.8 : 1 }}
                    disabled={!!loading}
                  >
                    {isLoading
                      ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement…</>
                      : <>Investir maintenant <ArrowRight size={13} /></>
                    }
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
    </div>
  );
}
