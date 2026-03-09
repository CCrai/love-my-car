'use client';

import { useEffect, useState } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getServicesByBusiness,
  createService,
  updateService,
  deleteService,
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

export default function ServicesPage() {
  const { currentBusiness } = useBusinessContext();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', type: 'fixed' as Service['type'] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManage = userRole === 'owner';

  useEffect(() => {
    if (!currentBusiness || !user) return;
    getServicesByBusiness(currentBusiness.id).then(setServices);
    getUserRoleInBusiness(user.uid, currentBusiness.id).then(setUserRole);
  }, [currentBusiness, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setError('');
    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: formData.name,
          price: parseFloat(formData.price),
          type: formData.type,
        });
        setServices(
          services.map((s) =>
            s.id === editingService.id
              ? { ...s, name: formData.name, price: parseFloat(formData.price), type: formData.type }
              : s
          )
        );
      } else {
        const newService = await createService(
          currentBusiness.id,
          formData.name,
          parseFloat(formData.price),
          formData.type
        );
        setServices([...services, newService]);
      }
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', price: '', type: 'fixed' });
    } catch {
      setError('Error al guardar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({ name: service.name, price: String(service.price), type: service.type });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) return;
    try {
      await deleteService(serviceId);
      setServices(services.filter((s) => s.id !== serviceId));
    } catch {
      setError('Error al eliminar el servicio');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({ name: '', price: '', type: 'fixed' });
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
