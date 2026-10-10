'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard, TrendingUp, Users, ArrowDownToLine,
  Settings, LogOut, Wallet, Menu, X, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/invest',    label: 'Investir',         icon: TrendingUp,     badge: '4 Plans' },
  { href: '/referral',  label: 'Parrainage',        icon: Users },
  { href: '/withdraw',  label: 'Retrait',           icon: ArrowDownToLine },
];

interface NavbarProps {
  userPhone?: string;
  walletBalance?: number;
  isAdmin?: boolean;
}

export default function Navbar({ userPhone: phoneProp, walletBalance: balanceProp, isAdmin: isAdminProp }: NavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [userPhone, setUserPhone] = useState(phoneProp || '');
  const [walletBalance, setWalletBalance] = useState(balanceProp ?? 0);
  const [isAdmin, setIsAdmin] = useState(isAdminProp ?? false);

  const accountRef = useRef<HTMLDivElement>(null);

  // Fetch real user data if not passed via props
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mePromise = api.me();

        if (!phoneProp || balanceProp === undefined) {
          const data = await api.dashboard();
          if (cancelled) return;
          if (!phoneProp) setUserPhone(data.user.phone);
          if (balanceProp === undefined) setWalletBalance(data.walletBalance);
        }

        const me = await mePromise;
        if (!cancelled) setIsAdmin((me as unknown as { role?: string }).role === 'douyin');
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 401) return;
      }
    })();

    return () => { cancelled = true; };
  }, [phoneProp, balanceProp]);

  const displayPhone = formatPhone(userPhone);

  // Ferme le menu au changement de route
  const pathnameRef = React.useRef(pathname);
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      setOpen(false);
      setAccountOpen(false);
    }
  });

  // Ferme le menu mobile si on clique en dehors
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  // Ferme le dropdown account si on clique en dehors
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [accountOpen]);

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    router.push('/auth');
  };

  return (
    <>
      <header className="navbar">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="navbar-logo"
          style={{ fontWeight: 900, fontSize: '17px', color: 'var(--primary)', letterSpacing: '-0.4px' }}
        >
          LEED
        </Link>

        {/* Navigation desktop */}
        <nav className="navbar-nav" role="navigation" aria-label="Navigation principale">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
                <Icon size={15} aria-hidden="true" />
                {label}
                {badge && <span className="nav-badge" aria-label={badge}>{badge}</span>}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/douyin"
              className={`nav-item ${pathname === '/douyin' ? 'active' : ''}`}
              style={{ color: 'var(--primary)', fontWeight: 700 }}
              aria-current={pathname === '/douyin' ? 'page' : undefined}
            >
              <ShieldCheck size={15} aria-hidden="true" /> Admin
            </Link>
          )}
        </nav>

        {/* Compte — droite desktop : wallet pill + dropdown */}
        <div className="navbar-right">
          <div className="navbar-wallet" aria-label={`Solde : ${walletBalance.toLocaleString('fr-FR')} FCFA`}>
            <Wallet size={13} aria-hidden="true" />
            <span>{walletBalance.toLocaleString('fr-FR')} FCFA</span>
          </div>

          {/* Account dropdown */}
          <div className="navbar-account" ref={accountRef}>
            <button
              className="navbar-account-btn"
              onClick={() => setAccountOpen(v => !v)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="Menu du compte"
            >
              <div className="user-avatar" aria-hidden="true">{displayPhone.slice(-2)}</div>
              <ChevronDown size={13} aria-hidden="true" style={{ color: 'var(--text-400)', transition: 'transform 0.2s', transform: accountOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {accountOpen && (
              <div className="navbar-account-dropdown" role="menu">
                <div className="navbar-dropdown-header" aria-label="Informations du compte">
                  <div className="navbar-phone-label">{displayPhone}</div>
                  <div className="navbar-balance-label">
                    <Wallet size={11} aria-hidden="true" />
                    {walletBalance.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <Link href="/settings" className="nav-item" role="menuitem">
                  <Settings size={14} aria-hidden="true" /> Paramètres
                </Link>
                <div className="navbar-dropdown-separator" role="separator" />
                <button
                  className="nav-item"
                  role="menuitem"
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--red-600)' }}
                  onClick={handleLogout}
                >
                  <LogOut size={14} aria-hidden="true" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bouton hamburger (mobile uniquement) */}
        <button
          className="mobile-menu-btn"
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </header>

      {/* Menu mobile déroulant */}
      <nav
        id="mobile-nav"
        className={`mobile-menu ${open ? 'open' : ''}`}
        onClick={e => e.stopPropagation()}
        aria-label="Navigation mobile"
        aria-hidden={!open}
      >
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" />
              {label}
              {badge && <span className="nav-badge">{badge}</span>}
            </Link>
          );
        })}

        <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`} aria-current={pathname === '/settings' ? 'page' : undefined}>
          <Settings size={16} aria-hidden="true" /> Paramètres
        </Link>

        {isAdmin && (
          <Link
            href="/douyin"
            className={`nav-item ${pathname === '/douyin' ? 'active' : ''}`}
            style={{ color: 'var(--primary)', fontWeight: 700 }}
          >
            <ShieldCheck size={16} aria-hidden="true" /> Admin
          </Link>
        )}

        {/* Solde + déco */}
        <div className="mobile-wallet-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="user-avatar" aria-hidden="true">{displayPhone.slice(-2)}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-900)' }}>{displayPhone}</div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wallet size={11} aria-hidden="true" /> {walletBalance.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-600)', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={handleLogout}
          >
            <LogOut size={15} aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}
