'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  LayoutDashboard, TrendingUp, Users, ArrowDownToLine,
  Settings, LogOut, Wallet, Menu, X,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/invest',    label: 'Investir',         icon: TrendingUp,     badge: '4 Plans' },
  { href: '/referral',  label: 'Parrainage',        icon: Users },
  { href: '/withdraw',  label: 'Retrait',           icon: ArrowDownToLine },
];

const secondaryNav = [
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

interface SidebarProps {
  userPhone?: string;
  walletBalance?: number;
}

// Format 8-digit phone "90123456" → "+228 90 12 34 56"
function formatPhone(phone: string): string {
  if (phone.startsWith("+228")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) {
    return `+228 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  return phone;
}

export default function Sidebar({ userPhone: phoneProp, walletBalance: balanceProp }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userPhone, setUserPhone] = useState(phoneProp || '');
  const [walletBalance, setWalletBalance] = useState(balanceProp ?? 0);

  // Fetch real user data if not passed via props
  useEffect(() => {
    if (phoneProp && balanceProp !== undefined) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await api.dashboard();
        if (cancelled) return;
        if (!phoneProp) setUserPhone(data.user.phone);
        if (balanceProp === undefined) setWalletBalance(data.walletBalance);
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 401) return;
        // Non-auth error — keep defaults
      }
    })();

    return () => { cancelled = true; };
  }, [phoneProp, balanceProp]);

  // Format for display
  const displayPhone = formatPhone(userPhone);

  // Ferme le menu au changement de route (via ref, pas setState direct)
  const pathnameRef = React.useRef(pathname);
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      setOpen(false);
    }
  });

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <>
      <header className="navbar">
        {/* Logo */}
        <Link href="/dashboard" className="navbar-logo">
          <Image
            src="/logo.jpeg" alt="LEED"
            width={32} height={32}
            style={{ borderRadius: '7px', objectFit: 'cover' }}
          />
        </Link>

        {/* Navigation desktop */}
        <nav className="navbar-nav">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={15} />
                {label}
                {badge && <span className="nav-badge">{badge}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Droite desktop */}
        <div className="navbar-right">
          {secondaryNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href} href={href}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}

          <div className="navbar-wallet">
            <Wallet size={13} />
            <span>{walletBalance.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <div className="navbar-user">
            <div className="user-avatar">{displayPhone.slice(-2)}</div>
            <span className="navbar-phone">{displayPhone}</span>
          </div>

          <button
            className="navbar-logout"
            title="Déconnexion"
            onClick={async (e) => {
              e.preventDefault();
              try { await api.logout(); } catch {}
              router.push("/auth");
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Bouton hamburger (mobile uniquement) */}
        <button
          className="mobile-menu-btn"
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Menu mobile déroulant */}
      <nav
        className={`mobile-menu ${open ? 'open' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
              {badge && <span className="nav-badge">{badge}</span>}
            </Link>
          );
        })}

        {secondaryNav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
            <Icon size={16} /> {label}
          </Link>
        ))}

        {/* Solde + déco */}
        <div className="mobile-wallet-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="user-avatar">{displayPhone.slice(-2)}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-900)' }}>{displayPhone}</div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wallet size={11} /> {walletBalance.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-600)', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={async () => {
              try { await api.logout(); } catch {}
              router.push("/auth");
            }}
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}
