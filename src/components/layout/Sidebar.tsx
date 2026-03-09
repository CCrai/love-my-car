'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/dashboard', label: '🏠 Dashboard' },
  { href: '/vehicles/entry', label: '🚗 Entrada de Vehículo' },
  { href: '/vehicles/active', label: '📋 Panel de trabajo' },
  { href: '/services', label: '⚙️ Servicios' },
  { href: '/employees', label: '👥 Empleados' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userProfile, logOut } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🚙</span>
        <span className={styles.logoText}>Love My Car</span>
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
  );
}
