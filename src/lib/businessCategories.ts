import { Business, BusinessCategory } from '@/types';

export const businessCategoryOptions: Array<{ value: BusinessCategory; label: string }> = [
  { value: 'parking', label: 'Estacionamiento (Parking)' },
  { value: 'lavadero', label: 'Lavadero de autos' },
  { value: 'taller_mecanica', label: 'Taller de mecanica' },
  { value: 'chapa_pintura', label: 'Taller de chapa y pintura' },
  { value: 'gomeria', label: 'Gomeria' },
];

const businessCategoryLabels: Record<BusinessCategory, string> = {
  parking: 'Parking',
  lavadero: 'Lavadero',
  taller_mecanica: 'Taller mecanica',
  chapa_pintura: 'Chapa y pintura',
  gomeria: 'Gomeria',
  taller: 'Taller',
};

export function getBusinessTypeList(business: Business): BusinessCategory[] {
  const normalizeLegacy = (type: BusinessCategory): BusinessCategory =>
    type === 'taller' ? 'taller_mecanica' : type;

  if (Array.isArray(business.types) && business.types.length > 0) {
    return business.types.map(normalizeLegacy);
  }
  if (business.type) {
    return [normalizeLegacy(business.type)];
  }
  return [];
}

export function formatBusinessTypes(types: BusinessCategory[]): string {
  return types
    .map((type) => businessCategoryLabels[type] || type)
    .join(' • ');
}
