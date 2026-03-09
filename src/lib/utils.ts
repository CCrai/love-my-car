export function formatDuration(entryTime: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - entryTime.getTime()) / 60000);
  if (diff < 60) return `${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}min`;
}

export function formatDurationLong(entryTime: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - entryTime.getTime()) / 60000);
  if (diff < 60) return `${diff} minutos`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours} horas ${mins} minutos`;
}

export function calculateHourlyPriceWithTolerance(
  entryTime: Date,
  hourlyPrice: number,
  minimumChargeMinutes: number = 60,
  toleranceMinutes: number = 15,
  toleranceChargeMode: 'tolerance' | 'half_hour' | 'hour' = 'tolerance',
  now: Date = new Date()
): number {
  const elapsedMinutes = Math.max(0, Math.ceil((now.getTime() - entryTime.getTime()) / 60000));

  const chargedMinutesPerTolerance =
    toleranceChargeMode === 'half_hour'
      ? 30
      : toleranceChargeMode === 'hour'
        ? 60
        : toleranceMinutes;

  let billableMinutes = minimumChargeMinutes;
  if (elapsedMinutes > minimumChargeMinutes) {
    const remaining = elapsedMinutes - minimumChargeMinutes;
    const toleranceBlocks = Math.ceil(remaining / toleranceMinutes);
    billableMinutes += toleranceBlocks * chargedMinutesPerTolerance;
  }

  const raw = (hourlyPrice * billableMinutes) / 60;
  return Number(raw.toFixed(2));
}

export function normalizePhoneForWhatsapp(phone: string): string {
  return phone.replace(/\D/g, '');
}
