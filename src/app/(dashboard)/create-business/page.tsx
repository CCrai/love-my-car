'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBusiness } from '@/lib/firestore/businesses';
import { Business } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import styles from './create-business.module.css';

const businessTypeOptions = [
  { value: 'parking', label: '🅿️ Estacionamiento (Parking)' },
  { value: 'lavadero', label: '🚿 Lavadero de Autos' },
  { value: 'taller', label: '🔧 Taller Mecánico' },
];

export default function CreateBusinessPage() {
  const [name, setName] = useState('');
  const [type, setType] = useState<Business['type']>('parking');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await createBusiness(name, type, user.uid);
      await refreshUserProfile();
      router.push('/dashboard');
    } catch {
      setError('Error al crear el negocio. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <span className={styles.logo}>🏢</span>
          <h1>Crear tu negocio</h1>
          <p>Configura tu negocio para comenzar a usar Love My Car</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <Card>
          <form onSubmit={handleSubmit} className="form-group">
            <Input
              id="business-name"
              label="Nombre del negocio"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Parking Central"
              required
            />
            <Select
              id="business-type"
              label="Tipo de negocio"
              options={businessTypeOptions}
              value={type}
              onChange={(e) => setType(e.target.value as Business['type'])}
            />
            <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              Crear negocio
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
