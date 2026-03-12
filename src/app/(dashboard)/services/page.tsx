'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getServicesByBusiness,
  createService,
  updateService,
  deleteService,
  setDefaultService,
} from '@/lib/firestore/services';
import { getUserRoleInBusiness } from '@/lib/firestore/employees';
import { Service } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import TopBar from '@/components/layout/TopBar';
import styles from './services.module.css';

const serviceTypeOptions = [
  { value: 'fixed', label: 'Precio fijo' },
  { value: 'hourly', label: 'Por hora' },
];

const minimumMinutesOptions = [
  { value: '30', label: '30 minutos' },
  { value: '60', label: '60 minutos' },
];

const toleranceMinutesOptions = [
  { value: '15', label: 'Cada 15 minutos' },
  { value: '30', label: 'Cada 30 minutos' },
  { value: '60', label: 'Cada 60 minutos' },
];

const toleranceChargeModeOptions = [
  { value: 'tolerance', label: 'Cobrar exactamente la tolerancia' },
  { value: 'half_hour', label: 'Cobrar media hora' },
  { value: 'hour', label: 'Cobrar una hora completa' },
];

export default function ServicesPage() {
  const { currentBusiness } = useBusinessContext();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    type: 'fixed' as Service['type'],
    isDefault: false,
    whatsappMessageTemplate: '',
    minimumChargeMinutes: '60' as '30' | '60',
    toleranceMinutes: '15' as '15' | '30' | '60',
    toleranceChargeMode: 'tolerance' as 'tolerance' | 'half_hour' | 'hour',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManage = userRole === 'owner';

  const loadServices = useCallback(async () => {
    if (!currentBusiness) return;
    const result = await getServicesByBusiness(currentBusiness.id);
    setServices(result);
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness || !user) return;
    loadServices();
    getUserRoleInBusiness(user.uid, currentBusiness.id).then(setUserRole);
  }, [currentBusiness, user, loadServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setError('');
    try {
      if (editingService) {
        const updatePayload: Partial<Omit<Service, 'id'>> = {
          name: formData.name,
          price: parseFloat(formData.price),
          type: formData.type,
          isDefault: formData.isDefault,
          whatsappMessageTemplate: formData.whatsappMessageTemplate,
        };
        if (formData.type === 'hourly') {
          updatePayload.minimumChargeMinutes = Number(formData.minimumChargeMinutes) as 30 | 60;
          updatePayload.toleranceMinutes = Number(formData.toleranceMinutes) as 15 | 30 | 60;
          updatePayload.toleranceChargeMode = formData.toleranceChargeMode;
        }
        await updateService(editingService.id, updatePayload);
        if (formData.isDefault) {
          await setDefaultService(currentBusiness.id, editingService.id);
        }
      } else {
        await createService(
          currentBusiness.id,
          formData.name,
          parseFloat(formData.price),
          formData.type,
          formData.type === 'hourly' ? (Number(formData.minimumChargeMinutes) as 30 | 60) : undefined,
          formData.type === 'hourly' ? (Number(formData.toleranceMinutes) as 15 | 30 | 60) : undefined,
          formData.type === 'hourly' ? formData.toleranceChargeMode : undefined,
          formData.whatsappMessageTemplate,
          formData.isDefault
        );
      }
      await loadServices();
      setShowForm(false);
      setEditingService(null);
      setFormData({
        name: '',
        price: '',
        type: 'fixed',
        isDefault: false,
        whatsappMessageTemplate: '',
        minimumChargeMinutes: '60',
        toleranceMinutes: '15',
        toleranceChargeMode: 'tolerance',
      });
    } catch {
      setError('Error al guardar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: String(service.price),
      type: service.type,
      isDefault: !!service.isDefault,
      whatsappMessageTemplate: service.whatsappMessageTemplate || '',
      minimumChargeMinutes: String(service.minimumChargeMinutes || service.minimumMinutes || 60) as '30' | '60',
      toleranceMinutes: String(service.toleranceMinutes || service.billingStepMinutes || 15) as '15' | '30' | '60',
      toleranceChargeMode: (service.toleranceChargeMode || 'tolerance') as 'tolerance' | 'half_hour' | 'hour',
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) return;
    try {
      await deleteService(serviceId);
      await loadServices();
    } catch {
      setError('Error al eliminar el servicio');
    }
  };

  const handleSetDefault = async (serviceId: string) => {
    if (!currentBusiness) return;
    try {
      await setDefaultService(currentBusiness.id, serviceId);
      await loadServices();
    } catch {
      setError('Error al establecer el servicio por defecto');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({
      name: '',
      price: '',
      type: 'fixed',
      isDefault: false,
      whatsappMessageTemplate: '',
      minimumChargeMinutes: '60',
      toleranceMinutes: '15',
      toleranceChargeMode: 'tolerance',
    });
  };

  return (
    <>
      <TopBar title="Gestionar Servicios" />
      <div className="main-content">
        {!canManage && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            Solo el propietario puede gestionar los servicios.
          </div>
        )}

        {canManage && (
          <div className={styles.actions}>
            <Button onClick={() => setShowForm(true)}>+ Agregar servicio</Button>
          </div>
        )}

        {showForm && (
          <Card title={editingService ? 'Editar servicio' : 'Nuevo servicio'} className={styles.formCard}>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit} className="form-group">
              <div className="form-row">
                <Input
                  id="service-name"
                  label="Nombre del servicio"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Lavado básico"
                  required
                />
                <Input
                  id="service-price"
                  label="Precio ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <Select
                id="service-type"
                label="Tipo de cobro"
                options={serviceTypeOptions}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Service['type'] })}
              />
              <div className={styles.templateGroup}>
                <label htmlFor="service-whatsapp-template" className={styles.templateLabel}>
                  Mensaje de WhatsApp (editable)
                </label>
                <textarea
                  id="service-whatsapp-template"
                  className={styles.templateInput}
                  rows={6}
                  value={formData.whatsappMessageTemplate}
                  onChange={(e) => setFormData({ ...formData, whatsappMessageTemplate: e.target.value })}
                  placeholder="Si lo dejas vacio, se usa el mensaje por defecto."
                />
                <p className={styles.templateHelp}>
                  Variables disponibles: {'{cliente}'} {'{negocio}'} {'{placa}'} {'{marca}'} {'{servicio}'} {'{fechaEntrada}'} {'{codigoRetiro}'}
                </p>
              </div>
              {formData.type === 'hourly' && (
                <>
                  <Select
                    id="service-minimum-charge"
                    label="1 - Minimo de cobro"
                    options={minimumMinutesOptions}
                    value={formData.minimumChargeMinutes}
                    onChange={(e) => setFormData({ ...formData, minimumChargeMinutes: e.target.value as '30' | '60' })}
                  />
                  <Select
                    id="service-tolerance-minutes"
                    label="2 - Tolerancia (cada cuanto se vuelve a cobrar)"
                    options={toleranceMinutesOptions}
                    value={formData.toleranceMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, toleranceMinutes: e.target.value as '15' | '30' | '60' })
                    }
                  />
                  <Select
                    id="service-tolerance-charge-mode"
                    label="3 - Cuanto se cobra por cada tolerancia"
                    options={toleranceChargeModeOptions}
                    value={formData.toleranceChargeMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        toleranceChargeMode: e.target.value as 'tolerance' | 'half_hour' | 'hour',
                      })
                    }
                  />
                  <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    Ejemplo: minimo 60 min + tolerancia 15 min. Si sale al minuto 76, se aplica un bloque de tolerancia.
                  </p>
                </>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span>Marcar como servicio por defecto (sugerido al ingresar vehiculos)</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button type="submit" loading={loading}>
                  {editingService ? 'Guardar cambios' : 'Crear servicio'}
                </Button>
                <Button variant="outline" type="button" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card title={`${services.length} servicios`}>
          {services.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No hay servicios configurados. Agrega tu primer servicio.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Por defecto</th>
                  <th>Regla</th>
                  <th>WhatsApp</th>
                  <th>Precio</th>
                  {canManage && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${service.type === 'hourly' ? 'badge-hourly' : 'badge-fixed'}`}
                      >
                        {service.type === 'hourly' ? 'Por hora' : 'Precio fijo'}
                      </span>
                    </td>
                    <td>
                      {service.isDefault ? (
                        <span className="badge badge-fixed">Sugerido</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {service.type === 'hourly'
                        ? `Minimo ${service.minimumChargeMinutes || service.minimumMinutes || 60} min | Tolerancia cada ${service.toleranceMinutes || service.billingStepMinutes || 15} min | Cobra por bloque: ${
                            service.toleranceChargeMode === 'hour'
                              ? '1 hora'
                              : service.toleranceChargeMode === 'half_hour'
                                ? 'media hora'
                                : `${service.toleranceMinutes || service.billingStepMinutes || 15} min`
                          }`
                        : 'Tarifa única'}
                    </td>
                    <td>
                      {service.whatsappMessageTemplate?.trim()
                        ? 'Personalizado'
                        : 'Por defecto'}
                    </td>
                    <td className={styles.price}>${service.price}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(service)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(service.id)}>
                            Eliminar
                          </Button>
                          {!service.isDefault && (
                            <Button size="sm" variant="secondary" onClick={() => handleSetDefault(service.id)}>
                              Marcar por defecto
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
