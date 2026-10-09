'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import { User, Phone, Shield, CheckCircle2, Lock, Settings } from 'lucide-react';

export default function SettingsPage() {
  const [phone,     setPhone]     = useState('90 12 34 56');
  const [name,      setName]      = useState('Kofi Mensah');
  const [saved,     setSaved]     = useState(false);
  const [passSaved, setPassSaved] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSavePass = (e: React.FormEvent) => {
    e.preventDefault();
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2500);
  };

  return (
    <div className="app-layout">
      <Sidebar userPhone={`+228 ${phone}`} walletBalance={9500} />

      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
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
                  <input
                    className="form-input"
                    type="text" value={name}
                    onChange={e => setName(e.target.value)}
                  />
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
                    <input
                      className="form-input" style={{ paddingLeft: '82px' }}
                      type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      maxLength={11}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mode de retrait par défaut</label>
                  <select className="form-input">
                    <option value="flooz">Flooz (Togocel)</option>
                    <option value="tmoney">T-Money (Moov)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-green"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                >
                  Enregistrer les modifications
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

              <form onSubmit={handleSavePass}>
                <div className="form-group">
                  <label className="form-label">Mot de passe actuel</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer le nouveau mot de passe</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>

                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                >
                  <Lock size={14} /> Changer le mot de passe
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
