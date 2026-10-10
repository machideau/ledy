'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Gift, AlertTriangle } from 'lucide-react';

import { api, ApiClientError } from '@/lib/api';
import { PLAN_LABELS } from '@/lib/plans';

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('register') === '1' || !!searchParams.get('ref') ? 'register' : 'login'
  );
  const planParam    = searchParams.get('plan') || '';
  const selectedPlan = PLAN_LABELS[planParam]
    ? `Plan ${PLAN_LABELS[planParam]} (${parseInt(planParam).toLocaleString('fr-FR')} FCFA)`
    : null;

  const refFromUrl = searchParams.get('ref') ?? '';

  const [phone,        setPhone]        = useState('');
  const [password,     setPassword]     = useState('');
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || phone.length < 8)       { setError('Entrez un numéro de téléphone valide (8 chiffres).'); return; }
    if (!password || password.length < 4) { setError('Le mot de passe doit comporter au moins 4 caractères.'); return; }
    if (mode === 'register' && !referralCode.trim()) {
      setError('Le code de parrainage est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register({ phone, password, referralCode: referralCode || undefined });
      } else {
        await api.login({ phone, password });
      }
      // Validate redirect to prevent open redirect attacks.
      // Only allow internal paths (must start with "/" and not be a protocol-relative URL "//…").
      const redirect = searchParams.get('redirect');
      const safeRedirect =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : '/dashboard';
      router.push(safeRedirect);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '32px 28px',
        boxShadow: 'var(--shadow-md)',
      }}>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Mode de connexion"
          style={{
            display: 'flex', gap: '4px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--r-md)', padding: '4px',
            marginBottom: '24px',
          }}
        >
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--r-sm)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--text-900)' : 'var(--text-400)',
                boxShadow: mode === m ? 'var(--shadow-xs)' : 'none',
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
            background: 'var(--amber-50)', border: '1px solid var(--amber-100)',
            borderRadius: 'var(--r-md)', padding: '10px 13px', marginBottom: '16px',
          }}>
            <Gift size={15} style={{ color: 'var(--amber-600)', flexShrink: 0 }} />
            <span style={{ color: 'var(--amber-600)', fontWeight: 700, fontSize: '13px' }}>
              {selectedPlan} sélectionné
            </span>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--red-50)', border: '1px solid var(--red-100)',
              borderRadius: 'var(--r-md)', padding: '10px 13px',
              marginBottom: '14px', color: 'var(--red-600)', fontSize: '13px',
            }}
          >
            <AlertTriangle size={15} aria-hidden="true" style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Téléphone */}
          <div className="form-group">
            <label className="form-label" htmlFor="auth-phone">
              <Phone size={11} aria-hidden="true" style={{ display: 'inline', marginRight: '4px' }} />
              Numéro de téléphone
            </label>
            <div style={{ position: 'relative' }}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  color: 'var(--text-400)', fontSize: '13px', fontWeight: 600,
                }}
              >
                +228
              </span>
              <input
                id="auth-phone"
                className="form-input"
                style={{ paddingLeft: '54px' }}
                type="tel"
                placeholder="XX XX XX XX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                autoComplete="tel-national"
                autoFocus
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              <Lock size={11} aria-hidden="true" style={{ display: 'inline', marginRight: '4px' }} />
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                className="form-input"
                style={{ paddingRight: '42px' }}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                style={{
                  position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-400)', display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Code parrainage (inscription seulement) */}
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">
                Code de parrainage <span style={{ color: 'var(--red-600)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex : LEED-AB1234"
                  value={referralCode}
                  onChange={e => !refFromUrl && setReferralCode(e.target.value.toUpperCase())}
                  readOnly={!!refFromUrl}
                  required
                  style={{
                    paddingRight: refFromUrl ? '38px' : undefined,
                    background: refFromUrl ? 'var(--bg-subtle)' : undefined,
                    color: refFromUrl ? 'var(--primary)' : undefined,
                    fontWeight: refFromUrl ? 700 : undefined,
                    cursor: refFromUrl ? 'default' : undefined,
                  }}
                />
                {refFromUrl && (
                  <span style={{
                    position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '11px', color: 'var(--green-600)',
                  }}>
                    ✓
                  </span>
                )}
              </div>
              {refFromUrl && (
                <div style={{ fontSize: '11px', color: 'var(--text-400)', marginTop: '4px' }}>
                  Code appliqué automatiquement via le lien de parrainage.
                </div>
              )}
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

      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg-app)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-400)' }}>
        Chargement…
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
