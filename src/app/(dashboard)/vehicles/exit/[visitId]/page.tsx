'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getVisitById, completeVisit } from '@/lib/firestore/visits';
import { getVehicleById } from '@/lib/firestore/vehicles';
import { getServiceById } from '@/lib/firestore/services';
import { Visit, Vehicle, Service } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import TopBar from '@/components/layout/TopBar';
import { applyMessageTemplate, calculateHourlyPriceWithTolerance, formatDurationLong, normalizePhoneForWhatsapp } from '@/lib/utils';
import styles from './exit.module.css';

export default function VehicleExitPage() {
  const params = useParams();
  const visitId = params.visitId as string;
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [finalPriceInput, setFinalPriceInput] = useState('0');
  const [isPriceEditable, setIsPriceEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [whatsAppUrl, setWhatsAppUrl] = useState('');

  useEffect(() => {
    if (!isPriceEditable) return;
    const input = document.getElementById('finalPrice') as HTMLInputElement | null;
    if (!input) return;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [isPriceEditable]);

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
          setFinalPriceInput(String(price));
          setIsPriceEditable(false);
        }
      })
      .finally(() => setLoading(false));
  }, [visitId]);

  const calculatePrice = (entryTime: Date, svc: Service): number => {
    if (svc.type === 'fixed') {
      return svc.price;
    }
    if (svc.type === 'open') {
      return 0;
    }
    return calculateHourlyPriceWithTolerance(
      entryTime,
      svc.price,
      svc.minimumChargeMinutes || svc.minimumMinutes || 60,
      svc.toleranceMinutes || svc.billingStepMinutes || 15,
      svc.toleranceChargeMode || 'tolerance'
    );
  };

  const handleConfirmExit = async () => {
    if (!visit || !service || !vehicle) return;
    setSubmitting(true);
    setError('');
    setWhatsAppUrl('');
    try {
      const parsedFinalPrice = Number(finalPriceInput.replace(',', '.'));
      if (!Number.isFinite(parsedFinalPrice) || parsedFinalPrice < 0) {
        setError('Ingresa un precio valido mayor o igual a 0.');
        setSubmitting(false);
        return;
      }

      const finalPrice = Math.round(parsedFinalPrice * 100) / 100;
      await completeVisit(visitId, finalPrice);

      if (service.type !== 'hourly') {
        const phone = normalizePhoneForWhatsapp(vehicle.clientPhone || '');
        if (phone) {
          const defaultMessage = [
            `Hola ${vehicle.clientName || 'cliente'}!`,
            `Tu vehiculo ${vehicle.plate} ya esta pronto para retirar.`,
            `Total a abonar: $${finalPrice}.`,
            'Te esperamos. Gracias!',
          ].join('\n');

          const customTemplate = service.whatsappMessageTemplate || '';
          const hasCustomTemplate = customTemplate.trim().length > 0;
          const baseMessage = hasCustomTemplate
            ? applyMessageTemplate(customTemplate, {
                cliente: vehicle.clientName || 'cliente',
                placa: vehicle.plate || '-',
                marca: vehicle.brand || '-',
                servicio: service.name || '-',
                precioFinal: String(finalPrice),
              })
            : defaultMessage;

          let message = baseMessage;

          if (service.type === 'open') {
            const completedTasks = (visit.taskChecklist || []).filter((task) => task.completed);
            const pendingTasks = (visit.taskChecklist || []).filter((task) => !task.completed);

            const completedBlock = completedTasks.length > 0
              ? completedTasks.map((task) => `- ${task.title}`).join('\n')
              : '- No se registraron tareas completadas';

            const pendingBlock = pendingTasks.length > 0
              ? pendingTasks.map((task) => `- ${task.title}`).join('\n')
              : '- No quedaron tareas pendientes';

            message = `${baseMessage}\n\nTrabajos realizados:\n${completedBlock}\n\nPendientes:\n${pendingBlock}`;
          }

          const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
          setWhatsAppUrl(url);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }

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

  const handleTogglePriceEdit = () => {
    setIsPriceEditable((prev) => !prev);
  };

  return (
    <>
      <TopBar title="Registrar Salida" />
      <div className="main-content">
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}
        {whatsAppUrl && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            Aviso de vehiculo listo preparado en WhatsApp. Si no se abrio automaticamente,{' '}
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">haz click aqui</a>.
          </div>
        )}

        <div className={styles.grid}>
          <Card title="Información del vehículo">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Placa</span>
                <span className={styles.plate}>{vehicle.plate}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Marca</span>
                <span>{vehicle.brand || '—'}</span>
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
                <span
                  className={`badge ${
                    service.type === 'hourly'
                      ? 'badge-hourly'
                      : service.type === 'open'
                        ? 'badge-open'
                        : 'badge-fixed'
                  }`}
                >
                  {service.type === 'hourly'
                    ? 'Por hora'
                    : service.type === 'open'
                      ? 'Variable'
                      : 'Precio fijo'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Precio base</span>
                <span>{service.type === 'open' ? 'A definir' : `$${service.price}`}</span>
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
                <div className={styles.totalLabelGroup}>
                  <span className={styles.totalLabel}>Total a cobrar</span>
                  <button
                    type="button"
                    className={styles.editPriceButton}
                    onClick={handleTogglePriceEdit}
                    aria-label={isPriceEditable ? 'Bloquear edicion de precio' : 'Editar precio'}
                    title={isPriceEditable ? 'Bloquear edicion' : 'Editar precio'}
                  >
                    ✎
                  </button>
                </div>
                <span className={styles.totalValue}>${finalPriceInput || '0'}</span>
              </div>
            </div>
            <div className={styles.priceEditor}>
              <Input
                id="finalPrice"
                label={isPriceEditable ? 'Precio final (editable)' : 'Precio final (bloqueado)'}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={finalPriceInput}
                onChange={(e) => setFinalPriceInput(e.target.value)}
                placeholder="0"
                disabled={!isPriceEditable}
                className={isPriceEditable ? styles.priceInputEditable : styles.priceInputLocked}
              />
              <div className={styles.priceActions}>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.fullWidthButton}
                  onClick={() => {
                    setFinalPriceInput(String(calculatedPrice));
                    setIsPriceEditable(false);
                  }}
                >
                  Usar precio sugerido (${calculatedPrice})
                </Button>
              </div>
            </div>
            {service.type === 'hourly' && (
              <p className={styles.priceNote}>
                * Minimo {service.minimumChargeMinutes || service.minimumMinutes || 60} min. Luego se evalua cada {service.toleranceMinutes || service.billingStepMinutes || 15} min y se cobra por bloque: {service.toleranceChargeMode === 'hour' ? '1 hora' : service.toleranceChargeMode === 'half_hour' ? 'media hora' : `${service.toleranceMinutes || service.billingStepMinutes || 15} min`}. ${service.price}/hora.
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
