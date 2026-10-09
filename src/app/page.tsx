'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import TogoFlag from '@/components/TogoFlag';

const plans = [
  { name: 'Starter',  amount: 2000,  remb: 1000,  gain: 2000,  color: 'var(--green-600)',  bg: 'var(--green-50)',  border: 'var(--green-100)'  },
  { name: 'Argent',   amount: 5000,  remb: 2500,  gain: 5000,  color: '#64748b',           bg: '#f8fafc',         border: '#e2e8f0'            },
  { name: 'Or',       amount: 15000, remb: 7500,  gain: 15000, color: 'var(--amber-600)',  bg: 'var(--amber-50)', border: 'var(--amber-100)',  featured: true },
  { name: 'Premium',  amount: 30000, remb: 15000, gain: 30000, color: 'var(--red-600)',    bg: 'var(--red-50)',   border: 'var(--red-100)'    },
];

const highlights = [
  { icon: Zap,        label: '50 % remboursé', sub: 'Immédiatement à la souscription' },
  { icon: TrendingUp, label: 'Mise x2',         sub: 'En 30 jours garantis'           },
  { icon: Users,      label: '500 FCFA',        sub: 'Par filleul parrainé'           },
];

export default function LandingPage() {
  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: '#fff', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/logo.jpeg" alt="LEED" width={32} height={32} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '17px', fontWeight: 900, color: 'var(--green-600)', letterSpacing: '-0.4px' }}>LEED</span>
          <div style={{ padding: '2px 8px', background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: 'var(--green-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TogoFlag size={12} /> Togo
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/auth" className="btn btn-outline btn-sm">Connexion</Link>
          <Link href="/auth?register=1" className="btn btn-green btn-sm">
            S&apos;inscrire <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '80px 20px 64px', textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '30px', background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-600)', fontSize: '12.5px', fontWeight: 700, marginBottom: '24px' }}>
          <TogoFlag size={14} /> Plateforme #1 au Togo
        </div>

        <h1 style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-900)', marginBottom: '18px', letterSpacing: '-1px' }}>
          Investissez &amp; doublez<br />
          <span style={{ color: 'var(--green-600)' }}>votre argent en 1 mois</span>
        </h1>

        <p style={{ fontSize: '16px', color: 'var(--text-500)', lineHeight: 1.7, marginBottom: '36px' }}>
          50 % remboursés immédiatement à la souscription.
          Mise doublée en 30 jours.{' '}
          <strong style={{ color: 'var(--text-900)' }}>500 FCFA</strong> offerts par filleul parrainé.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '48px' }}>
          <Link href="/auth?register=1" className="btn btn-green btn-lg">
            Commencer maintenant <ArrowRight size={16} />
          </Link>
          <a href="#plans" className="btn btn-outline btn-lg">Voir les plans</a>
        </div>

        {/* Highlights */}
        <div className="grid-3" style={{ marginBottom: '44px' }}>
          {highlights.map(({ icon: Icon, label, sub }) => (
            <div key={label} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 12px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={18} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-900)', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-400)', fontWeight: 500, lineHeight: 1.4 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" style={{ padding: '0 20px 72px', maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.5px' }}>
            Les 4 Plans d&apos;Investissement
          </h2>
          <p style={{ color: 'var(--text-400)', fontSize: '14px', marginTop: '6px' }}>
            Paiement rapide via Flooz ou T-Money
          </p>
        </div>

        <div className="plans-grid">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`plan-card ${p.featured ? 'plan-card-featured' : ''}`}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: p.bg, border: `1px solid ${p.border}`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <TrendingUp size={20} />
              </div>

              <div className="plan-name">Plan {p.name}</div>
              <div className="plan-amount">{p.amount.toLocaleString('fr-FR')}</div>
              <div className="plan-currency">FCFA</div>

              <div className="plan-recap">
                <div className="plan-recap-row">
                  <span>Remboursé immédiat</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>{p.remb.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="plan-recap-row">
                  <span>Gain à J+30</span>
                  <span style={{ fontWeight: 700, color: p.color }}>+{p.gain.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="plan-recap-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-900)' }}>Total reçu</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-900)' }}>{(p.remb + p.gain).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                {[`Dépôt : ${p.amount.toLocaleString('fr-FR')} FCFA`, `Remboursé immédiat : ${p.remb.toLocaleString('fr-FR')} FCFA`, `Gain en 1 mois : +${p.gain.toLocaleString('fr-FR')} FCFA`].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--text-700)' }}>
                    <CheckCircle2 size={13} style={{ color: p.color, flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>

              <Link href={`/auth?register=1&plan=${p.amount}`} className="plan-btn" style={{ background: p.color }}>
                Choisir ce plan <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '18px 32px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-400)', fontSize: '12.5px', background: '#fff' }}>
        <span>LEED Togo © 2026</span>
        <span>Plateforme d&apos;investissement communautaire au Togo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TogoFlag size={14} />
          <span>Lomé, Togo</span>
        </div>
      </footer>

    </main>
  );
}
