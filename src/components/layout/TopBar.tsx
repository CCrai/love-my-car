'use client';

import { useBusinessContext } from '@/contexts/BusinessContext';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { currentBusiness } = useBusinessContext();

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      {currentBusiness && (
        <div className={styles.businessBadge}>
          <span className={styles.businessType}>{currentBusiness.type}</span>
          <span className={styles.businessName}>{currentBusiness.name}</span>
        </div>
      )}
    </header>
  );
}
