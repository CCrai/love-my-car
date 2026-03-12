export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  businesses: string[];
}

export interface Business {
  id: string;
  name: string;
  type: 'parking' | 'lavadero' | 'taller';
  ownerId: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  businessId: string;
  userId: string;
  email?: string;
  role: 'owner' | 'admin' | 'employee';
}

export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  price: number;
  type: 'fixed' | 'hourly';
  isDefault?: boolean;
  whatsappMessageTemplate?: string;
  minimumChargeMinutes?: 30 | 60;
  toleranceMinutes?: 15 | 30 | 60;
  toleranceChargeMode?: 'tolerance' | 'half_hour' | 'hour';
  // Legacy fields kept for backwards compatibility with existing documents.
  minimumMinutes?: 30 | 60;
  billingStepMinutes?: 15;
}

export interface Visit {
  id: string;
  businessId: string;
  vehicleId: string;
  serviceId: string;
  entryTime: Date;
  exitTime: Date | null;
  status: 'active' | 'completed';
  totalPrice: number;
  notes: string;
  // Populated fields for display
  vehicle?: Vehicle;
  service?: Service;
}
