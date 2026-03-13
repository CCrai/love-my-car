'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBusiness } from '@/lib/firestore/businesses';
import { BusinessCategory } from '@/types';
import { businessCategoryOptions } from '@/lib/businessCategories';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import styles from './create-business.module.css';

export default function CreateBusinessPage() {
  const [name, setName] = useState('');
  const [types, setTypes] = useState<BusinessCategory[]>(['parking']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUserProfile } = useAuth();
  const router = useRouter();

  const handleToggleType = (nextType: BusinessCategory) => {
    setTypes((prev) =>
      prev.includes(nextType)
        ? prev.filter((item) => item !== nextType)
        : [...prev, nextType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (types.length === 0) {
      setError('Selecciona al menos un rubro para el negocio.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createBusiness(name, types, user.uid);
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
            <div className={styles.typeGroup}>
              <p className={styles.typeTitle}>¿Que servicios ofrece tu negocio?</p>
              <p className={styles.typeHint}>Puedes seleccionar mas de una opcion.</p>
              <div className={styles.typeGrid}>
                {businessCategoryOptions.map((option) => {
                  const checked = types.includes(option.value);
                  return (
                    <label key={option.value} className={styles.typeOption}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              Crear negocio
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
