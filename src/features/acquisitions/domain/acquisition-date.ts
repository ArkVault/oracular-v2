const ACQUISITION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertAcquisitionDate(date: string): void {
  if (
    !ACQUISITION_DATE_PATTERN.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))
  ) {
    throw new Error(`Invalid acquisition date: ${date}`);
  }
}

export function acquisitionDateToLocalDate(date: string): Date {
  assertAcquisitionDate(date);
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function localDateToAcquisitionDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toWmsDayTimeRange(date: string): string {
  assertAcquisitionDate(date);
  return `${date}T00:00:00Z/${date}T23:59:59Z`;
}
