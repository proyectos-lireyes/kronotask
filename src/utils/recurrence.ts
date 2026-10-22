import { RecurrenceRule, RecurrenceUnit, TaskItem } from '../types';

export function calculateNextOccurrence(
  currentStart: string,
  currentEnd: string,
  recurrence: RecurrenceRule
): { nextStart: string; nextEnd: string } {
  const start = new Date(currentStart);
  const end = new Date(currentEnd);
  const durationMs = Math.max(1000 * 60 * 30, end.getTime() - start.getTime());

  const addTime = (d: Date, interval: number, unit: RecurrenceUnit): Date => {
    const result = new Date(d);
    switch (unit) {
      case 'hours':
        result.setHours(result.getHours() + interval);
        break;
      case 'days':
        result.setDate(result.getDate() + interval);
        break;
      case 'weeks':
        result.setDate(result.getDate() + interval * 7);
        break;
      case 'months':
        result.setMonth(result.getMonth() + interval);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + interval);
        break;
    }
    return result;
  };

  const nextStart = addTime(start, recurrence.interval, recurrence.unit);
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  return {
    nextStart: nextStart.toISOString(),
    nextEnd: nextEnd.toISOString(),
  };
}

export function formatRecurrenceLabel(rule?: RecurrenceRule): string {
  if (!rule || !rule.enabled) return 'Sin repetición';
  const { interval, unit } = rule;
  const unitMap: Record<RecurrenceUnit, { singular: string; plural: string }> = {
    hours: { singular: 'hora', plural: 'horas' },
    days: { singular: 'día', plural: 'días' },
    weeks: { singular: 'semana', plural: 'semanas' },
    months: { singular: 'mes', plural: 'meses' },
    years: { singular: 'año', plural: 'años' },
  };

  const label = interval === 1 ? unitMap[unit].singular : `${interval} ${unitMap[unit].plural}`;
  return `Cada ${label}`;
}
