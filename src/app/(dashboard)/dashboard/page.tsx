'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { getActiveVisits } from '@/lib/firestore/visits';
import { getServicesByBusiness } from '@/lib/firestore/services';
import { getEmployeesByBusiness } from '@/lib/firestore/employees';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { currentBusiness } = useBusinessContext();
  const [stats, setStats] = useState({ activeVisits: 0, services: 0, employees: 0 });

  useEffect(() => {
    if (!currentBusiness) return;
    Promise.all([
      getActiveVisits(currentBusiness.id),
      getServicesByBusiness(currentBusiness.id),
      getEmployeesByBusiness(currentBusiness.id),
    ]).then(([visits, services, employees]) => {
      setStats({
        activeVisits: visits.length,
        services: services.length,
        employees: employees.length,
      });
    });
  }, [currentBusiness]);

  if (!currentBusiness) {
    return (
      <>
        <TopBar title="Dashboard" />
        <div className="main-content">
          <Card>
            <div className={styles.noBusinessContainer}>
              <span className={styles.noBusinessIcon}>🏢</span>
              <h2>No tienes un negocio activo</h2>
              <p>Crea tu primer negocio para comenzar a usar la plataforma</p>
              <Link href="/create-business">
                <button className={styles.createBtn}>Crear negocio</button>
              </Link>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="main-content">
        <p className={styles.welcome}>
          Bienvenido, <strong>{userProfile?.name}</strong> 👋
        </p>

        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}>🚗</div>
            <div className={styles.statValue}>{stats.activeVisits}</div>
            <div className={styles.statLabel}>Vehículos activos</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}>⚙️</div>
            <div className={styles.statValue}>{stats.services}</div>
            <div className={styles.statLabel}>Servicios</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statValue}>{stats.employees}</div>
            <div className={styles.statLabel}>Empleados</div>
          </Card>
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
          <div className={styles.actionsGrid}>
            <Link href="/vehicles/entry" className={styles.actionCard}>
              <span className={styles.actionIcon}>🚗</span>
              <span className={styles.actionLabel}>Registrar entrada</span>
            </Link>
            <Link href="/vehicles/active" className={styles.actionCard}>
              <span className={styles.actionIcon}>📋</span>
              <span className={styles.actionLabel}>Ver activos</span>
            </Link>
            <Link href="/services" className={styles.actionCard}>
              <span className={styles.actionIcon}>⚙️</span>
              <span className={styles.actionLabel}>Gestionar servicios</span>
            </Link>
            <Link href="/employees" className={styles.actionCard}>
              <span className={styles.actionIcon}>👥</span>
              <span className={styles.actionLabel}>Empleados</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
