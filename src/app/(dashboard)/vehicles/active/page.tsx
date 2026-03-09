'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { getVisitsByBusiness } from '@/lib/firestore/visits';
import { getVehicleById } from '@/lib/firestore/vehicles';
import { getServiceById } from '@/lib/firestore/services';
import { Visit } from '@/types';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import styles from './active.module.css';

type TabType = 'active' | 'history';

function getDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActiveVehiclesPage() {
  const { currentBusiness } = useBusinessContext();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('active');
  const [filterDay, setFilterDay] = useState('');

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    getVisitsByBusiness(currentBusiness.id)
      .then(async (allVisits) => {
        const enriched = await Promise.all(
          allVisits.map(async (visit) => {
            const [vehicle, service] = await Promise.all([
              getVehicleById(visit.vehicleId),
              getServiceById(visit.serviceId),
            ]);
            return { ...visit, vehicle: vehicle || undefined, service: service || undefined };
          })
        );

        const sorted = [...enriched].sort(
          (a, b) => b.entryTime.getTime() - a.entryTime.getTime()
        );
        setVisits(sorted);
      })
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  const activeVisits = visits.filter((visit) => visit.status === 'active');
  const historyVisitsBase = visits.filter((visit) => visit.status !== 'active');
  const historyVisits = filterDay
    ? historyVisitsBase.filter((visit) => getDateInputValue(visit.entryTime) === filterDay)
    : historyVisitsBase;

  return (
    <>
      <TopBar title="Vehículos" />
      <div className="main-content">
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${tab === 'active' ? styles.activeTab : ''}`}
            onClick={() => setTab('active')}
          >
            Activos ({activeVisits.length})
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${tab === 'history' ? styles.activeTab : ''}`}
            onClick={() => setTab('history')}
          >
            Completados ({historyVisitsBase.length})
          </button>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : tab === 'active' && activeVisits.length === 0 ? (
          <Card>
            <div className={styles.empty}>
              <span>🚗</span>
              <p>No hay vehículos activos en este momento</p>
              <Link href="/vehicles/entry">
                <Button>Registrar entrada</Button>
              </Link>
            </div>
          </Card>
        ) : tab === 'active' ? (
          <Card title={`${activeVisits.length} vehículos activos`}>
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
                  {activeVisits.map((visit) => (
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
        ) : (
          <Card title="Historial de vehículos">
            <div className={styles.filtersRow}>
              <label htmlFor="day-filter" className={styles.filterLabel}>
                Filtrar por día
              </label>
              <input
                id="day-filter"
                type="date"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className={styles.dateInput}
              />
              {filterDay ? (
                <Button variant="outline" size="sm" onClick={() => setFilterDay('')}>
                  Limpiar
                </Button>
              ) : null}
            </div>

            {historyVisits.length === 0 ? (
              <p className={styles.emptyHistory}>No hay registros para el filtro seleccionado.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <span className={styles.plate}>{visit.vehicle?.plate}</span>
                        </td>
                        <td>
                          <div>{visit.vehicle?.clientName}</div>
                          <div className={styles.phone}>{visit.vehicle?.clientPhone}</div>
                        </td>
                        <td>{visit.service?.name || '—'}</td>
                        <td>
                          {visit.entryTime.toLocaleString('es', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </td>
                        <td>
                          {visit.exitTime
                            ? visit.exitTime.toLocaleString('es', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td>${visit.totalPrice || 0}</td>
                        <td>
                          <span className="badge badge-fixed">
                            {visit.status === 'completed' ? 'Completado' : visit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
