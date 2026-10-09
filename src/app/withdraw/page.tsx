'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TogoFlag from '@/components/TogoFlag';
import { Wallet, ArrowDownToLine, CheckCircle2, Clock, CreditCard, Smartphone, AlertTriangle } from 'lucide-react';

const WITHDRAWALS = [
  { date: '10 Sep 2026', amount: 7500, type: 'Remboursement 50%',     plan: 'Or',      status: 'paid',    ref: 'WD-001' },
  { date: '14 Sep 2026', amount: 500,  type: 'Commission parrainage', plan: '-',        status: 'paid',    ref: 'WD-002' },
  { date: '25 Sep 2026', amount: 1000, type: 'Remboursement 50%',     plan: 'Starter',  status: 'paid',    ref: 'WD-003' },
  { date: '09 Oct 2026', amount: 500,  type: 'Commission parrainage', plan: '-',        status: 'pending', ref: 'WD-004' },
];

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export default function WithdrawPage() {
  const [method,  setMethod]  = useState<'flooz' | 'tmoney'>('flooz');
  const [amount,  setAmount]  = useState('');
  const [phone,   setPhone]   = useState('');
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(false);

  const balance = 9500;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone || parseInt(amount) > balance) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setDone(true);
  };

  const totalPaid = WITHDRAWALS.filter(w => w.status === 'paid').reduce((s, w) => s + w.amount, 0);

  return (
    <div className="app-layout">
      <Sidebar userPhone="+228 90 12 34 56" walletBalance={balance} />

      <main className="main-content">
        <div className="page-container">

          {/* ── Header ── */}
          <div className="page-header">
            <div>
              <h1 className="page-title">
                Retrait <CreditCard size={22} style={{ color: 'var(--leed-green)' }} />
              </h1>
              <p className="page-subtitle">Retirez vos gains sur Flooz ou T-Money</p>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '24px' }}>

            {/* ── Formulaire ── */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '18px' }}>Effectuer un retrait</div>

              {done ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'var(--leed-green-pale)', margin: '0 auto 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle2 size={28} style={{ color: 'var(--leed-green)' }} />
                  </div>
                  <h3 style={{ fontWeight: 800, color: 'var(--leed-green)', marginBottom: '8px' }}>Retrait soumis !</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px' }}>
                    Votre retrait de{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{fmt(parseInt(amount))} FCFA</strong>{' '}
                    sera traité sous 24 h.
                  </p>
                  <button
                    className="btn btn-green"
                    onClick={() => { setDone(false); setAmount(''); setPhone(''); }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Nouveau retrait
                  </button>
                </div>
              ) : (
                <form onSubmit={handleWithdraw}>

                  {/* Solde */}
                  <div style={{
                    background: 'var(--leed-green-pale)', border: '1px solid var(--border-green)',
                    borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Wallet size={15} style={{ color: 'var(--leed-green)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Solde disponible</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '17px', color: 'var(--leed-green)' }}>
                      {fmt(balance)} FCFA
                    </span>
                  </div>

                  {/* Méthode */}
                  <div className="form-group">
                    <label className="form-label">Méthode de retrait</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['flooz', 'tmoney'] as const).map(m => (
                        <button
                          key={m} type="button" onClick={() => setMethod(m)}
                          style={{
                            flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            border: `1.5px solid ${method === m ? 'var(--leed-green)' : 'var(--border)'}`,
                            background: method === m ? 'var(--leed-green-pale)' : '#fff',
                            color: method === m ? 'var(--leed-green)' : 'var(--text-secondary)',
                            fontWeight: 700, fontSize: '13px', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.15s',
                          }}
                        >
                          <Smartphone size={13} />
                          {m === 'flooz' ? 'Flooz (Togocel)' : 'T-Money (Moov)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numéro */}
                  <div className="form-group">
                    <label className="form-label">Numéro de réception</label>
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
                        value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={8}
                      />
                    </div>
                  </div>

                  {/* Montant */}
                  <div className="form-group">
                    <label className="form-label">Montant (FCFA)</label>
                    <input
                      className="form-input"
                      type="number" placeholder="Ex : 5000"
                      min={500} max={balance}
                      value={amount} onChange={e => setAmount(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>
                      {[1000, 2500, 5000, balance].map(v => (
                        <button key={v} type="button" onClick={() => setAmount(String(v))} className="btn btn-outline btn-sm">
                          {fmt(v)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Erreur solde */}
                  {amount && parseInt(amount) > balance && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: 'var(--togo-red)', fontSize: '12.5px', marginBottom: '10px',
                    }}>
                      <AlertTriangle size={13} /> Solde insuffisant. Maximum : {fmt(balance)} FCFA
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-green"
                    disabled={loading || !amount || !phone}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px', opacity: loading ? 0.75 : 1 }}
                  >
                    {loading ? (
                      <>
                        <span style={{
                          display: 'inline-block', width: '15px', height: '15px',
                          border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                        }} />
                        Traitement…
                      </>
                    ) : (
                      <><ArrowDownToLine size={15} /> Retirer {amount ? fmt(parseInt(amount)) : '0'} FCFA</>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* ── Historique ── */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>Historique des retraits</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {WITHDRAWALS.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    padding: '12px 14px', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: w.status === 'paid' ? 'var(--leed-green-pale)' : 'var(--leed-yellow-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {w.status === 'paid'
                          ? <CheckCircle2 size={15} style={{ color: 'var(--leed-green)' }} />
                          : <Clock        size={15} style={{ color: 'var(--leed-yellow)' }} />
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{w.type}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.date} · {w.ref}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--leed-green)' }}>+{fmt(w.amount)} FCFA</div>
                      <span className={`badge ${w.status === 'paid' ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: '10px' }}>
                        {w.status === 'paid' ? 'Versé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{
                marginTop: '14px', padding: '12px 14px',
                background: 'var(--leed-green-pale)', border: '1px solid var(--border-green)',
                borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Total reçu</span>
                <span style={{ fontWeight: 800, color: 'var(--leed-green)', fontSize: '14px' }}>
                  {fmt(totalPaid)} FCFA
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
