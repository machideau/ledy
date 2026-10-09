'use client';
import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp, Users, CheckCircle2, CreditCard, Star } from 'lucide-react';

import { PLANS } from '@/lib/plans';
import { fmt } from '@/lib/format';

const PLAN_DISPLAY: Record<string, { color: string; bg: string; border: string }> = {
  starter: { color: 'var(--green-600)',  bg: 'var(--green-50)',  border: 'var(--green-100)'  },
  silver:  { color: 'var(--text-400)',   bg: 'var(--bg-subtle)', border: 'var(--border)'     },
  gold:    { color: 'var(--amber-600)',  bg: 'var(--amber-50)',  border: 'var(--amber-100)'  },
  premium: { color: 'var(--red-600)',    bg: 'var(--red-50)',    border: 'var(--red-100)'    },
};

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
          {/* pas de logo image */}
          <span style={{ fontSize: '17px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.4px' }}>LEED</span>
          <div style={{ padding: '2px 8px', background: 'var(--primary-pale)', border: '1px solid var(--primary-light)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '30px', background: 'var(--primary-pale)', border: '1px solid var(--primary-light)', color: 'var(--primary)', fontSize: '12.5px', fontWeight: 700, marginBottom: '24px' }}>
          Plateforme #1 au Togo
        </div>

        <h1 style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-900)', marginBottom: '18px', letterSpacing: '-1px' }}>
          Investissez &amp; doublez<br />
          <span style={{ color: 'var(--primary)' }}>votre argent en 1 mois</span>
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
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-pale)', border: '1px solid var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon size={18} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-900)', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-400)', fontWeight: 500, lineHeight: 1.4 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ padding: '0 20px 56px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
          {[
            { value: '1 200+', label: 'membres actifs',       sub: 'au Togo'            },
            { value: '48 M+',  label: 'FCFA distribués',      sub: 'depuis le lancement' },
            { value: '4.9 ★',  label: 'satisfaction moyenne', sub: 'sur 500+ avis'      },
          ].map(({ value, label, sub }) => (
            <div key={label} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 16px' }}>
              <div style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-900)', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-400)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Témoignages */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '20px' }}>
          {[
            { name: 'Kofi A.',   city: 'Lomé',     text: 'J\'ai souscrit au plan Or. J\'ai reçu 7 500 FCFA en moins de 24 h, et le reste à J+30 comme promis.' },
            { name: 'Akosua M.', city: 'Kara',     text: 'Simple et rapide. Le paiement se fait en 2 minutes via Mixx by Yas. Je recommande à toute ma famille.' },
            { name: 'Edem K.',   city: 'Tsévié',   text: 'Grâce au parrainage j\'ai gagné 3 500 FCFA supplémentaires ce mois-ci. Vraiment une bonne plateforme.' },
          ].map(({ name, city, text }) => (
            <div key={name} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 16px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {[1,2,3,4,5].map(n => <Star key={n} size={12} fill="var(--amber-600)" style={{ color: 'var(--amber-600)' }} />)}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-600)', lineHeight: 1.6, marginBottom: '12px' }}>&ldquo;{text}&rdquo;</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-pale)', border: '1px solid var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', color: 'var(--primary)' }}>
                  {name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-900)' }}>{name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-400)' }}>{city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ padding: '0 20px 72px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.5px' }}>
            Comment ça marche ?
          </h2>
          <p style={{ color: 'var(--text-400)', fontSize: '14px', marginTop: '6px' }}>
            En 3 étapes simples, votre argent travaille pour vous
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            {
              step: '01', icon: CreditCard,
              color: 'var(--green-600)', bg: 'var(--green-50)', border: 'var(--green-100)',
              title: 'Inscrivez-vous & choisissez un plan',
              desc: 'Créez votre compte gratuitement, sélectionnez un plan entre 2 000 et 30 000 FCFA.',
              detail: 'Moins de 2 minutes',
            },
            {
              step: '02', icon: Zap,
              color: 'var(--amber-600)', bg: 'var(--amber-50)', border: 'var(--amber-100)',
              title: '50 % remboursé immédiatement',
              desc: 'Dès que votre paiement Flooz ou Mixx by Yas est confirmé, la moitié vous est reversée sous 24 h.',
              detail: 'Remboursement garanti',
            },
            {
              step: '03', icon: TrendingUp,
              color: 'var(--primary)', bg: 'var(--primary-pale)', border: 'var(--primary-light)',
              title: 'Votre mise x2 en 30 jours',
              desc: 'À J+30, votre dépôt initial vous est rendu en double. Retirez via Flooz ou Mixx by Yas.',
              detail: 'J+30 garanti',
            },
          ].map(({ step, icon: Icon, color, bg, border, title, desc, detail }) => (
            <div key={step} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 'var(--r-lg)', padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: `1px solid ${border}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color, opacity: 0.75 }}>Étape {step}</div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-900)', lineHeight: 1.25 }}>{title}</div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-500)', lineHeight: 1.65, marginBottom: '12px' }}>{desc}</p>
              <span style={{ fontSize: '12px', fontWeight: 700, color, background: '#fff', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${border}` }}>
                {detail}
              </span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link href="/auth?register=1" className="btn btn-green btn-lg">
            Commencer maintenant <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" style={{ padding: '0 20px 72px', maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.5px' }}>
            Les 4 Plans d&apos;Investissement
          </h2>
          <p style={{ color: 'var(--text-400)', fontSize: '14px', marginTop: '6px' }}>
            Paiement rapide via Flooz ou Mixx by Yas
          </p>
        </div>

        <div className="plans-grid">
          {PLANS.map((p) => {
            const d = PLAN_DISPLAY[p.id];
            return (
            <div
              key={p.name}
              className={`plan-card ${p.featured ? 'plan-card-featured' : ''}`}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: d.bg, border: `1px solid ${d.border}`, color: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <TrendingUp size={20} />
              </div>

              <div className="plan-name">Plan {p.name}</div>
              <div className="plan-amount">{fmt(p.amount)}</div>
              <div className="plan-currency">FCFA</div>

              <div className="plan-recap">
                <div className="plan-recap-row">
                  <span>Remboursé immédiat</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-600)' }}>{fmt(p.remb)} FCFA</span>
                </div>
                <div className="plan-recap-row">
                  <span>Gain à J+30</span>
                  <span style={{ fontWeight: 700, color: d.color }}>+{fmt(p.gain)} FCFA</span>
                </div>
                <div className="plan-recap-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-900)' }}>Total reçu</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-900)' }}>{fmt(p.remb + p.gain)} FCFA</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                {[`Dépôt : ${fmt(p.amount)} FCFA`, `Remboursé immédiat : ${fmt(p.remb)} FCFA`, `Gain en 1 mois : +${fmt(p.gain)} FCFA`].map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--text-700)' }}>
                    <CheckCircle2 size={13} style={{ color: d.color, flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>

              <Link href={`/auth?register=1&plan=${p.amount}`} className="plan-btn" style={{ background: d.color }}>
                Choisir ce plan <ArrowRight size={13} />
              </Link>
            </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '18px 32px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-400)', fontSize: '12.5px', background: '#fff' }}>
        <span>LEED Togo © 2026</span>
        <span>Plateforme d&apos;investissement communautaire au Togo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Lomé, Togo</span>
        </div>
      </footer>

    </main>
  );
}
