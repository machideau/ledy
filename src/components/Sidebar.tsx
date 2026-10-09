'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, Users, ArrowDownToLine,
  Settings, LogOut, Wallet, Menu, X,
} from 'lucide-react';

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

export default function Sidebar({ userPhone = '+228 XX XX XX XX', walletBalance = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme le menu au changement de route
  useEffect(() => { setOpen(false); }, [pathname]);

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
            <div className="user-avatar">{userPhone.slice(-2)}</div>
            <span className="navbar-phone">{userPhone}</span>
          </div>

          <Link href="/auth" className="navbar-logout" title="Déconnexion">
            <LogOut size={15} />
          </Link>
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
            <div className="user-avatar">{userPhone.slice(-2)}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-900)' }}>{userPhone}</div>
              <div style={{ fontSize: '12px', color: 'var(--green-600)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wallet size={11} /> {walletBalance.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          </div>
          <Link href="/auth" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-600)', fontSize: '13px', fontWeight: 700 }}>
            <LogOut size={15} /> Déconnexion
          </Link>
        </div>
      </nav>
    </>
  );
}
