'use client';

import { useEffect, useState } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmployeesByBusiness,
  inviteEmployee,
  getUserRoleInBusiness,
} from '@/lib/firestore/employees';
import { Employee } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import TopBar from '@/components/layout/TopBar';
import styles from './employees.module.css';

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
];

export default function EmployeesPage() {
  const { currentBusiness } = useBusinessContext();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (!currentBusiness || !user) return;
    getEmployeesByBusiness(currentBusiness.id).then(setEmployees);
    getUserRoleInBusiness(user.uid, currentBusiness.id).then(setUserRole);
  }, [currentBusiness, user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const newEmployee = await inviteEmployee(currentBusiness.id, userId, role);
      setEmployees([...employees, newEmployee]);
      setSuccess('Empleado invitado exitosamente');
      setUserId('');
      setShowForm(false);
    } catch {
      setError('Error al invitar al empleado. Verifica el ID de usuario.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (empRole: string) => {
    const labels: Record<string, string> = {
      owner: '👑 Propietario',
      admin: '🛡️ Administrador',
      employee: '👤 Empleado',
    };
    return labels[empRole] || empRole;
  };

  return (
    <>
      <TopBar title="Empleados" />
      <div className="main-content">
        {canManage && (
          <div className={styles.actions}>
            <Button onClick={() => setShowForm(true)}>+ Invitar empleado</Button>
          </div>
        )}

        {showForm && (
          <Card title="Invitar empleado" className={styles.formCard}>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>
            )}
            <form onSubmit={handleInvite} className="form-group">
              <Input
                id="userId"
                label="ID de usuario (UID de Firebase)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ingresa el UID del usuario"
                required
              />
              <Select
                id="role"
                label="Rol"
                options={roleOptions}
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button type="submit" loading={loading}>Invitar</Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card title={`${employees.length} empleados`}>
          {employees.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No hay empleados registrados.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID de Usuario</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <code className={styles.uid}>{emp.userId}</code>
                    </td>
                    <td>
                      <span className="badge">{getRoleLabel(emp.role)}</span>
                    </td>
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
