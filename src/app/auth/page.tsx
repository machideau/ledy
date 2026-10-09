'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Zap, TrendingUp, Users, Smartphone, Gift, AlertTriangle } from 'lucide-react';
import TogoFlag from '@/components/TogoFlag';
import { api, ApiClientError } from '@/lib/api';
import { PLAN_LABELS } from '@/lib/plans';

const features = [
  { icon: Zap,        text: '50 % de votre dépôt remboursé immédiatement' },
  { icon: TrendingUp, text: 'Mise doublée en 30 jours' },
  { icon: Users,      text: '500 FCFA par filleul qui souscrit' },
  { icon: Smartphone, text: 'Paiement via Flooz & T-Money' },
];

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('register') === '1' ? 'register' : 'login'
  );
  const planParam    = searchParams.get('plan') || '';
  const selectedPlan = PLAN_LABELS[planParam]
    ? `Plan ${PLAN_LABELS[planParam]} (${parseInt(planParam).toLocaleString('fr-FR')} FCFA)`
    : null;

  const [phone,        setPhone]        = useState('');
  const [password,     setPassword]     = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || phone.length < 8)    { setError('Entrez un numéro de téléphone valide (8 chiffres).'); return; }
    if (!password || password.length < 4) { setError('Le mot de passe doit comporter au moins 4 caractères.'); return; }
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register({ phone, password, referralCode: referralCode || undefined });
      } else {
        await api.login({ phone, password });
      }
      // Check for redirect param
      const redirect = searchParams.get('redirect');
      router.push(redirect || '/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="togo-stripe" />

      {/* ── PANNEAU GAUCHE ── */}
      <div className="auth-left">
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <Image
            src="/logo.jpeg" alt="LEED Logo" width={80} height={80}
            style={{ borderRadius: '16px', marginBottom: '20px', boxShadow: 'var(--shadow-green)' }}
          />
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            Doublez votre argent<br />
            <span style={{ color: 'var(--leed-green)' }}>en 1 mois !</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '32px' }}>
            La plateforme d&apos;investissement communautaire dédiée aux Togolais.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '11px 14px',
              }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: 'var(--leed-green-pale)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} style={{ color: 'var(--leed-green)' }} />
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANNEAU DROIT ── */}
      <div className="auth-right">
        {/* Logo mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          <Image src="/logo.jpeg" alt="LEED" width={32} height={32} style={{ borderRadius: '7px' }} />
          <span className="logo-text">LEED</span>
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
          {mode === 'login' ? 'Bon retour !' : 'Créez votre compte'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          {mode === 'login' ? 'Connectez-vous à votre espace personnel' : 'Rejoignez des milliers de Togolais prospères'}
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)', padding: '4px',
          marginBottom: '24px',
        }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Plan sélectionné */}
        {mode === 'register' && selectedPlan && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--leed-yellow-light)', border: '1px solid var(--border-yellow)',
            borderRadius: 'var(--radius-md)', padding: '10px 13px', marginBottom: '16px',
          }}>
            <Gift size={15} style={{ color: 'var(--leed-yellow)', flexShrink: 0 }} />
            <span style={{ color: 'var(--leed-yellow)', fontWeight: 700, fontSize: '13px' }}>
              {selectedPlan} sélectionné
            </span>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)', padding: '10px 13px',
            marginBottom: '14px', color: 'var(--togo-red)', fontSize: '13px',
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Téléphone */}
          <div className="form-group">
            <label className="form-label">
              <Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />
              Numéro de téléphone (Togo)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600,
              }}>
                <TogoFlag size={13} /> +228
              </span>
              <input
                className="form-input" style={{ paddingLeft: '82px' }}
                type="tel" placeholder="XX XX XX XX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label className="form-label">
              <Lock size={11} style={{ display: 'inline', marginRight: '4px' }} />
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input" style={{ paddingRight: '42px' }}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Code parrainage (inscription) */}
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Code de parrainage (optionnel)</label>
              <input
                className="form-input"
                type="text" placeholder="Ex: LEED-AB1234"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <Gift size={11} style={{ color: 'var(--leed-yellow)' }} />
                Votre parrain reçoit 500 FCFA si vous investissez
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-green"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '12px', marginTop: '6px', opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: '15px', height: '15px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Vérification…
              </>
            ) : (
              <>{mode === 'login' ? 'Se connecter' : "S'inscrire"} <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px', lineHeight: 1.6 }}>
          En continuant, vous acceptez nos conditions d&apos;utilisation.<br />
          Plateforme réservée aux résidents du Togo.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Chargement…
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
