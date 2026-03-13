'use client';

import { useBusinessContext } from '@/contexts/BusinessContext';
import { formatBusinessTypes, getBusinessTypeList } from '@/lib/businessCategories';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { currentBusiness } = useBusinessContext();

  const handleOpenMenu = () => {
    window.dispatchEvent(new Event('sidebar:open'));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.titleGroup}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={handleOpenMenu}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {currentBusiness && (
        <div className={styles.businessBadge}>
          <span className={styles.businessType}>
            {formatBusinessTypes(getBusinessTypeList(currentBusiness)) || 'Sin rubros'}
          </span>
          <span className={styles.businessName}>{currentBusiness.name}</span>
        </div>
      )}
    </header>
  );
}
