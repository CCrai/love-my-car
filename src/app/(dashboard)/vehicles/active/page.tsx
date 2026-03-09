'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { getActiveVisits } from '@/lib/firestore/visits';
import { getVehicleById } from '@/lib/firestore/vehicles';
import { getServiceById } from '@/lib/firestore/services';
import { Visit } from '@/types';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './active.module.css';

export default function ActiveVehiclesPage() {
  const { currentBusiness } = useBusinessContext();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    getActiveVisits(currentBusiness.id)
      .then(async (activeVisits) => {
        const enriched = await Promise.all(
          activeVisits.map(async (visit) => {
            const [vehicle, service] = await Promise.all([
              getVehicleById(visit.vehicleId),
              getServiceById(visit.serviceId),
            ]);
            return { ...visit, vehicle: vehicle || undefined, service: service || undefined };
          })
        );
        setVisits(enriched);
      })
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  const formatDuration = (entryTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - entryTime.getTime()) / 60000);
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <>
      <TopBar title="Vehículos Activos" />
      <div className="main-content">
        {loading ? (
          <p>Cargando...</p>
        ) : visits.length === 0 ? (
          <Card>
            <div className={styles.empty}>
              <span>🚗</span>
              <p>No hay vehículos activos en este momento</p>
              <Link href="/vehicles/entry">
                <Button>Registrar entrada</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card title={`${visits.length} vehículos activos`}>
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Entrada</th>
                    <th>Tiempo</th>
                    <th>Notas</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <span className={styles.plate}>{visit.vehicle?.plate}</span>
                      </td>
                      <td>
                        <div>{visit.vehicle?.clientName}</div>
                        <div className={styles.phone}>{visit.vehicle?.clientPhone}</div>
                      </td>
                      <td>
                        <div>{visit.service?.name}</div>
                        <span className={`badge ${visit.service?.type === 'hourly' ? 'badge-hourly' : 'badge-fixed'}`}>
                          {visit.service?.type === 'hourly' ? 'Por hora' : 'Precio fijo'}
                        </span>
                      </td>
                      <td>{visit.entryTime.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className={styles.duration}>{formatDuration(visit.entryTime)}</td>
                      <td>{visit.notes || '—'}</td>
                      <td>
                        <Link href={`/vehicles/exit/${visit.id}`}>
                          <Button size="sm">Registrar salida</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
