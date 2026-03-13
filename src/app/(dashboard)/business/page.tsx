'use client';

import { useEffect, useState } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRoleInBusiness } from '@/lib/firestore/employees';
import { updateBusinessInfo } from '@/lib/firestore/businesses';
import { businessCategoryOptions, getBusinessTypeList } from '@/lib/businessCategories';
import { BusinessCategory } from '@/types';
import TopBar from '@/components/layout/TopBar';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './business.module.css';

export default function BusinessPage() {
  const { currentBusiness, refreshCurrentBusiness } = useBusinessContext();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [types, setTypes] = useState<BusinessCategory[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!currentBusiness) return;
    setName(currentBusiness.name);
    setTypes(getBusinessTypeList(currentBusiness));
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness || !user) return;
    getUserRoleInBusiness(user.uid, currentBusiness.id).then(setUserRole);
  }, [currentBusiness, user]);

  const handleToggleType = (nextType: BusinessCategory) => {
    setTypes((prev) =>
      prev.includes(nextType)
        ? prev.filter((item) => item !== nextType)
        : [...prev, nextType]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    if (types.length === 0) {
      setError('Selecciona al menos un rubro.');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateBusinessInfo(currentBusiness.id, { name: name.trim(), types });
      await refreshCurrentBusiness();
      setSuccess('Datos del negocio actualizados.');
    } catch {
      setError('No se pudo actualizar la informacion del negocio.');
    } finally {
      setLoading(false);
    }
  };

  const canManage = userRole === 'owner';

  return (
    <>
      <TopBar title="Mi negocio" />
      <div className="main-content">
        {!currentBusiness && <Card title="Mi negocio"><p>No hay un negocio seleccionado.</p></Card>}

        {currentBusiness && (
          <Card title="Administrar informacion del negocio">
            {!canManage && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                Solo el propietario puede editar esta informacion.
              </div>
            )}
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <form className="form-group" onSubmit={handleSave}>
              <Input
                id="business-name-settings"
                label="Nombre del negocio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!canManage}
              />

              <div className={styles.typeGroup}>
                <p className={styles.typeTitle}>Rubros / servicios ofrecidos</p>
                <p className={styles.typeHint}>Puedes marcar mas de uno (ejemplo: Parking + Lavadero).</p>
                <div className={styles.typeGrid}>
                  {businessCategoryOptions.map((option) => {
                    const checked = types.includes(option.value);
                    return (
                      <label key={option.value} className={styles.typeOption}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage}
                          onChange={() => handleToggleType(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <Button type="submit" loading={loading} disabled={!canManage}>Guardar cambios</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
