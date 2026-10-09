'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import { User, Phone, Shield, CheckCircle2, Lock, Settings, AlertTriangle } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { formatPhone } from '@/lib/format';

export default function SettingsPage() {
  const [phone,     setPhone]     = useState('');
  const [name,      setName]      = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [saved,     setSaved]     = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass,      setNewPass]      = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const user = await api.me();
        setPhone(user.phone);
        setName(user.name || '');
        setReferralCode(user.referralCode);
      } catch {
        // Redirected by proxy if 401
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({ name, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setPassError(err instanceof ApiClientError ? err.message : 'Erreur.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass !== confirmPass) {
      setPassError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPass.length < 4) {
      setPassError('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    setSavingPass(true);
    try {
      await api.changePassword({ currentPassword: currentPass, newPassword: newPass });
      setPassSaved(true);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setPassSaved(false), 2500);
    } catch (err) {
      setPassError(err instanceof ApiClientError ? err.message : 'Erreur.');
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
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

  const displayPhone = formatPhone(phone);

  return (
    <div className="app-layout">
      <Sidebar userPhone={displayPhone} />

      <main className="main-content">
        <div className="page-container">

          <div className="page-header">
            <div>
              <h1 className="page-title">
                Paramètres <Settings size={22} style={{ color: 'var(--text-muted)' }} />
              </h1>
              <p className="page-subtitle">Gérez vos informations personnelles et votre sécurité</p>
            </div>
          </div>

          <div className="grid-2">

            {/* ── Profil ── */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '18px' }}>
                <User size={16} style={{ color: 'var(--leed-green)' }} /> Informations personnelles
              </div>

              {saved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'var(--leed-green-pale)', border: '1px solid var(--border-green)',
                  borderRadius: 'var(--radius-md)', padding: '10px 13px',
                  color: 'var(--leed-green)', fontSize: '13px', marginBottom: '14px',
                }}>
                  <CheckCircle2 size={15} /> Profil mis à jour avec succès !
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Nom complet</label>
                  <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    Numéro de téléphone (+228)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600,
                    }}>
                      <TogoFlag size={13} /> +228
                    </span>
                    <input className="form-input" style={{ paddingLeft: '82px' }} type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={8} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Code de parrainage</label>
                  <input className="form-input" type="text" value={referralCode} disabled style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 800, color: 'var(--leed-yellow)', opacity: 0.8 }} />
                  <div style={{ fontSize: '11px', color: 'var(--text-400)', marginTop: '4px' }}>Votre code est unique et ne peut pas être modifié.</div>
                </div>

                <button type="submit" className="btn btn-green" disabled={savingProfile} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', opacity: savingProfile ? 0.75 : 1 }}>
                  {savingProfile ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>

            {/* ── Sécurité ── */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '18px' }}>
                <Shield size={16} style={{ color: 'var(--leed-yellow)' }} /> Sécurité du compte
              </div>

              {passSaved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'var(--leed-green-pale)', border: '1px solid var(--border-green)',
                  borderRadius: 'var(--radius-md)', padding: '10px 13px',
                  color: 'var(--leed-green)', fontSize: '13px', marginBottom: '14px',
                }}>
                  <CheckCircle2 size={15} /> Mot de passe modifié avec succès !
                </div>
              )}

              {passError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)', padding: '10px 13px',
                  color: 'var(--togo-red)', fontSize: '13px', marginBottom: '14px',
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {passError}
                </div>
              )}

              <form onSubmit={handleSavePass}>
                <div className="form-group">
                  <label className="form-label">Mot de passe actuel</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer le nouveau mot de passe</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                </div>

                <button type="submit" className="btn btn-outline" disabled={savingPass} style={{ width: '100%', justifyContent: 'center', marginTop: '8px', opacity: savingPass ? 0.75 : 1 }}>
                  <Lock size={14} /> {savingPass ? 'Modification…' : 'Changer le mot de passe'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
