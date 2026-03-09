'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getVisitById, completeVisit } from '@/lib/firestore/visits';
import { getVehicleById } from '@/lib/firestore/vehicles';
import { getServiceById } from '@/lib/firestore/services';
import { Visit, Vehicle, Service } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TopBar from '@/components/layout/TopBar';
import { formatDurationLong } from '@/lib/utils';
import styles from './exit.module.css';

export default function VehicleExitPage() {
  const params = useParams();
  const visitId = params.visitId as string;
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!visitId) return;
    setLoading(true);
    getVisitById(visitId)
      .then(async (v) => {
        if (!v) return;
        setVisit(v);
        const [veh, svc] = await Promise.all([
          getVehicleById(v.vehicleId),
          getServiceById(v.serviceId),
        ]);
        setVehicle(veh);
        setService(svc);
        if (svc) {
          const price = calculatePrice(v.entryTime, svc);
          setCalculatedPrice(price);
        }
      })
      .finally(() => setLoading(false));
  }, [visitId]);

  const calculatePrice = (entryTime: Date, svc: Service): number => {
    if (svc.type === 'fixed') {
      return svc.price;
    }
    const now = new Date();
    const diffMs = now.getTime() - entryTime.getTime();
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return hours * svc.price;
  };

  const handleConfirmExit = async () => {
    if (!visit || !service) return;
    setSubmitting(true);
    setError('');
    try {
      const finalPrice = calculatePrice(visit.entryTime, service);
      await completeVisit(visitId, finalPrice);
      setSuccess(`Salida registrada. Total: $${finalPrice}`);
      setTimeout(() => router.push('/vehicles/active'), 1500);
    } catch {
      setError('Error al registrar la salida');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>;
  if (!visit || !vehicle || !service) return <div style={{ padding: '2rem' }}>Visita no encontrada</div>;

  return (
    <>
      <TopBar title="Registrar Salida" />
      <div className="main-content">
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

        <div className={styles.grid}>
          <Card title="Información del vehículo">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Placa</span>
                <span className={styles.plate}>{vehicle.plate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cliente</span>
                <span>{vehicle.clientName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Teléfono</span>
                <span>{vehicle.clientPhone || '—'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Notas</span>
                <span>{vehicle.notes || '—'}</span>
              </div>
            </div>
          </Card>

          <Card title="Detalles del servicio">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Servicio</span>
                <span>{service.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={`badge ${service.type === 'hourly' ? 'badge-hourly' : 'badge-fixed'}`}>
                  {service.type === 'hourly' ? 'Por hora' : 'Precio fijo'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Precio base</span>
                <span>${service.price}</span>
              </div>
            </div>
          </Card>

          <Card title="Resumen de visita">
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Hora de entrada</span>
                <span className={styles.summaryValue}>
                  {visit.entryTime.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Hora de salida</span>
                <span className={styles.summaryValue}>
                  {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Tiempo total</span>
                <span className={styles.summaryValue}>{formatDurationLong(visit.entryTime)}</span>
              </div>
              <div className={styles.totalItem}>
                <span className={styles.totalLabel}>Total a cobrar</span>
                <span className={styles.totalValue}>${calculatedPrice}</span>
              </div>
            </div>
            {service.type === 'hourly' && (
              <p className={styles.priceNote}>
                * Se cobra por hora completa. ${service.price}/hora
              </p>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button onClick={handleConfirmExit} loading={submitting} size="lg">
                Confirmar salida y cobro
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
