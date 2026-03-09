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
  return `${hours}h ${mins}min`;
}
