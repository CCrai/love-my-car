'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { subscribeVisitsByBusiness, updateVisitTaskChecklist } from '@/lib/firestore/visits';
import { getVehicleById } from '@/lib/firestore/vehicles';
import { getServiceById } from '@/lib/firestore/services';
import { Visit, VisitTaskItem } from '@/types';
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

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

export default function ActiveVehiclesPage() {
  const { currentBusiness } = useBusinessContext();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('active');
  const [filterDay, setFilterDay] = useState(getDateInputValue(new Date()));
  const [now, setNow] = useState(() => new Date());
  const [taskDraftByVisit, setTaskDraftByVisit] = useState<Record<string, string>>({});
  const [savingTaskVisitId, setSavingTaskVisitId] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    let cancelled = false;

    const unsubscribe = subscribeVisitsByBusiness(currentBusiness.id, (allVisits) => {
      void (async () => {
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
        if (cancelled) return;
        setVisits(sorted);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentBusiness]);

  const activeVisits = visits.filter((visit) => visit.status === 'active');
  const historyVisitsBase = visits.filter((visit) => visit.status !== 'active');
  const todayKey = getDateInputValue(new Date());
  const todayRevenue = historyVisitsBase.reduce((sum, visit) => {
    const referenceDate = visit.exitTime || visit.entryTime;
    return getDateInputValue(referenceDate) === todayKey ? sum + (visit.totalPrice || 0) : sum;
  }, 0);
  const historyVisits = historyVisitsBase.filter((visit) => {
    const referenceDate = visit.exitTime || visit.entryTime;
    return getDateInputValue(referenceDate) === filterDay;
  });
  const filteredRevenue = historyVisits.reduce((sum, visit) => sum + (visit.totalPrice || 0), 0);

  const setVisitChecklistLocally = (visitId: string, taskChecklist: VisitTaskItem[]) => {
    setVisits((prev) =>
      prev.map((visit) =>
        visit.id === visitId ? { ...visit, taskChecklist } : visit
      )
    );
  };

  const persistVisitChecklist = async (visitId: string, taskChecklist: VisitTaskItem[]) => {
    setSavingTaskVisitId(visitId);
    try {
      await updateVisitTaskChecklist(visitId, taskChecklist);
      setVisitChecklistLocally(visitId, taskChecklist);
    } finally {
      setSavingTaskVisitId(null);
    }
  };

  const handleToggleTask = async (visit: Visit, taskId: string) => {
    const nextChecklist = (visit.taskChecklist || []).map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    await persistVisitChecklist(visit.id, nextChecklist);
  };

  const handleRemoveTask = async (visit: Visit, taskId: string) => {
    const nextChecklist = (visit.taskChecklist || []).filter((task) => task.id !== taskId);
    await persistVisitChecklist(visit.id, nextChecklist);
  };

  const handleAddTask = async (visit: Visit) => {
    const draft = (taskDraftByVisit[visit.id] || '').trim();
    if (!draft) return;

    const nextChecklist = [
      ...(visit.taskChecklist || []),
      {
        id: `manual-${Date.now()}`,
        title: draft,
        completed: false,
      },
    ];

    setTaskDraftByVisit((prev) => ({ ...prev, [visit.id]: '' }));
    await persistVisitChecklist(visit.id, nextChecklist);
  };

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
            <div className={styles.headerRow}>
              <div className={styles.headerRight}>
                <span className={styles.totalLabel}>Recaudado hoy</span>
                <strong className={styles.totalValue}>{currencyFormatter.format(todayRevenue)}</strong>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.responsiveTable}>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Entrada</th>
                    <th>Tiempo</th>
                    <th>Notas</th>
                    <th>Tareas</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td data-label="Placa">
                        <span className={styles.plate}>{visit.vehicle?.plate}</span>
                        {visit.vehicle?.brand && <div className={styles.vehicleMeta}>{visit.vehicle.brand}</div>}
                      </td>
                      <td data-label="Cliente">
                        <div>{visit.vehicle?.clientName}</div>
                        <div className={styles.phone}>{visit.vehicle?.clientPhone}</div>
                      </td>
                      <td data-label="Servicio">
                        <div>{visit.service?.name}</div>
                        <span
                          className={`badge ${
                            visit.service?.type === 'hourly'
                              ? 'badge-hourly'
                              : visit.service?.type === 'open'
                                ? 'badge-open'
                                : 'badge-fixed'
                          }`}
                        >
                          {visit.service?.type === 'hourly'
                            ? 'Por hora'
                            : visit.service?.type === 'open'
                              ? 'Variable'
                              : 'Precio fijo'}
                        </span>
                      </td>
                      <td data-label="Entrada">{visit.entryTime.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td data-label="Tiempo" className={styles.duration}>{formatDuration(visit.entryTime, now)}</td>
                      <td data-label="Notas">{visit.notes || '—'}</td>
                      <td data-label="Tareas">
                        {visit.service?.type !== 'open' ? (
                          '—'
                        ) : (
                          <div className={styles.taskCell}>
                            <div className={styles.taskAddRow}>
                              <input
                                className={styles.taskInput}
                                value={taskDraftByVisit[visit.id] || ''}
                                onChange={(e) =>
                                  setTaskDraftByVisit((prev) => ({
                                    ...prev,
                                    [visit.id]: e.target.value,
                                  }))
                                }
                                placeholder="Nueva tarea"
                              />
                              <button
                                type="button"
                                className={styles.taskButton}
                                onClick={() => handleAddTask(visit)}
                                disabled={savingTaskVisitId === visit.id}
                              >
                                Agregar
                              </button>
                            </div>
                            {(visit.taskChecklist || []).length === 0 ? (
                              <span className={styles.taskEmpty}>Sin tareas</span>
                            ) : (
                              <ul className={styles.taskList}>
                                {(visit.taskChecklist || []).map((task) => (
                                  <li key={task.id} className={styles.taskRow}>
                                    <label className={styles.taskCheck}>
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => handleToggleTask(visit, task.id)}
                                        disabled={savingTaskVisitId === visit.id}
                                      />
                                      <span className={task.completed ? styles.taskDone : ''}>{task.title}</span>
                                    </label>
                                    <button
                                      type="button"
                                      className={styles.taskRemove}
                                      onClick={() => handleRemoveTask(visit, task.id)}
                                      disabled={savingTaskVisitId === visit.id}
                                    >
                                      Quitar
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </td>
                      <td data-label="Acción" className={styles.actionCell}>
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
            <div className={styles.headerRow}>
              <div className={styles.headerLeft}>
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
              </div>
              <div className={styles.headerRight}>
                <span className={styles.totalLabel}>Recaudado</span>
                <strong className={styles.totalValue}>{currencyFormatter.format(filteredRevenue)}</strong>
              </div>
            </div>

            {historyVisits.length === 0 ? (
              <p className={styles.emptyHistory}>No hay registros para el filtro seleccionado.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.responsiveTable}>
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Tareas realizadas</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td data-label="Placa">
                          <span className={styles.plate}>{visit.vehicle?.plate}</span>
                          {visit.vehicle?.brand && <div className={styles.vehicleMeta}>{visit.vehicle.brand}</div>}
                        </td>
                        <td data-label="Cliente">
                          <div>{visit.vehicle?.clientName}</div>
                          <div className={styles.phone}>{visit.vehicle?.clientPhone}</div>
                        </td>
                        <td data-label="Servicio">{visit.service?.name || '—'}</td>
                        <td data-label="Entrada">
                          {visit.entryTime.toLocaleString('es', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </td>
                        <td data-label="Salida">
                          {visit.exitTime
                            ? visit.exitTime.toLocaleString('es', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td data-label="Tareas realizadas">
                          {(visit.taskChecklist || []).filter((task) => task.completed).length === 0 ? (
                            <span className={styles.historyTaskEmpty}>Sin tareas realizadas</span>
                          ) : (
                            <ul className={styles.historyTaskList}>
                              {(visit.taskChecklist || [])
                                .filter((task) => task.completed)
                                .map((task) => (
                                  <li key={task.id} className={styles.historyTaskItem}>
                                    {task.title}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </td>
                        <td data-label="Total">${visit.totalPrice || 0}</td>
                        <td data-label="Estado">
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
