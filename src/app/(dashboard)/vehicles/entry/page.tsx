'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { getVehicleByPlate, createVehicle } from '@/lib/firestore/vehicles';
import { createVisit } from '@/lib/firestore/visits';
import { getServicesByBusiness } from '@/lib/firestore/services';
import { Service, Vehicle } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import TopBar from '@/components/layout/TopBar';
import styles from './entry.module.css';

export default function VehicleEntryPage() {
  const { currentBusiness } = useBusinessContext();
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'details' | 'service'>('search');
  const [plate, setPlate] = useState('');
  const [vehicle, setVehicle] = useState<Partial<Vehicle>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentBusiness) {
      getServicesByBusiness(currentBusiness.id).then(setServices);
    }
  }, [currentBusiness]);

  const handleSearchPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const existing = await getVehicleByPlate(plate);
      if (existing) {
        setVehicle(existing);
      } else {
        setVehicle({ plate: plate.toUpperCase() });
      }
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('service');
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !selectedServiceId) return;
    setLoading(true);
    setError('');
    try {
      let vehicleId = (vehicle as Vehicle).id;
      if (!vehicleId) {
        const newVehicle = await createVehicle(
          vehicle.plate || plate,
          vehicle.clientName || '',
          vehicle.clientPhone || '',
          vehicle.notes || ''
        );
        vehicleId = newVehicle.id;
      }
      await createVisit(currentBusiness.id, vehicleId, selectedServiceId, notes);
      setSuccess('¡Visita registrada exitosamente!');
      setTimeout(() => router.push('/vehicles/active'), 1500);
    } catch {
      setError('Error al registrar la visita');
    } finally {
      setLoading(false);
    }
  };

  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name} - $${s.price} (${s.type === 'hourly' ? 'Por hora' : 'Precio fijo'})`,
  }));

  return (
    <>
      <TopBar title="Registrar Entrada" />
      <div className="main-content">
        <div className={styles.steps}>
          <div className={`${styles.step} ${step === 'search' ? styles.active : styles.done}`}>
            1. Buscar placa
          </div>
          <div className={styles.stepDivider}>→</div>
          <div className={`${styles.step} ${step === 'details' ? styles.active : step === 'service' ? styles.done : ''}`}>
            2. Datos del vehículo
          </div>
          <div className={styles.stepDivider}>→</div>
          <div className={`${styles.step} ${step === 'service' ? styles.active : ''}`}>
            3. Seleccionar servicio
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

        {step === 'search' && (
          <Card title="Buscar vehículo por placa">
            <form onSubmit={handleSearchPlate} className="form-group">
              <Input
                id="plate"
                label="Placa del vehículo"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123"
                required
              />
              <Button type="submit" loading={loading}>Buscar / Continuar</Button>
            </form>
          </Card>
        )}

        {step === 'details' && (
          <Card title="Datos del cliente y vehículo">
            <form onSubmit={handleDetailsNext} className="form-group">
              <Input
                id="plate-display"
                label="Placa"
                value={vehicle.plate || plate}
                disabled
              />
              <Input
                id="clientName"
                label="Nombre del cliente"
                type="text"
                value={vehicle.clientName || ''}
                onChange={(e) => setVehicle({ ...vehicle, clientName: e.target.value })}
                placeholder="Nombre del cliente"
                required
              />
              <Input
                id="clientPhone"
                label="Teléfono del cliente"
                type="tel"
                value={vehicle.clientPhone || ''}
                onChange={(e) => setVehicle({ ...vehicle, clientPhone: e.target.value })}
                placeholder="+1234567890"
              />
              <Input
                id="vehicleNotes"
                label="Notas del vehículo"
                type="text"
                value={vehicle.notes || ''}
                onChange={(e) => setVehicle({ ...vehicle, notes: e.target.value })}
                placeholder="Observaciones del vehículo"
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="outline" onClick={() => setStep('search')}>Atrás</Button>
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          </Card>
        )}

        {step === 'service' && (
          <Card title="Seleccionar servicio">
            <form onSubmit={handleCreateVisit} className="form-group">
              {services.length === 0 ? (
                <div className="alert alert-error">
                  No hay servicios configurados. Primero debes crear un servicio.
                </div>
              ) : (
                <Select
                  id="service"
                  label="Servicio"
                  options={serviceOptions}
                  placeholder="Selecciona un servicio"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  required
                />
              )}
              <Input
                id="visitNotes"
                label="Notas de la visita"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales"
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="outline" onClick={() => setStep('details')}>Atrás</Button>
                <Button type="submit" loading={loading} disabled={services.length === 0}>
                  Registrar entrada
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
