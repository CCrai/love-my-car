'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/dashboard', label: '🏠 Dashboard' },
  { href: '/vehicles/entry', label: '🚗 Registrar Entrada' },
  { href: '/vehicles/active', label: '📋 Trabajos' },
  { href: '/services', label: '⚙️ Servicios' },
  { href: '/employees', label: '👥 Empleados' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userProfile, logOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {!mobileOpen && (
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
      )}

      {mobileOpen && <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🚙</span>
          <span className={styles.logoText}>Love My Car</span>
          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menu"
          >
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userProfile?.name || 'Usuario'}</span>
            <span className={styles.userEmail}>{userProfile?.email}</span>
          </div>
          <button className={styles.logoutBtn} onClick={logOut}>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
