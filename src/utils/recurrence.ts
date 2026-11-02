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

export function isTaskOccurringOnDate(task: TaskItem, date: Date): boolean {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const taskStart = new Date(task.startDate).getTime();
  const taskEnd = new Date(task.endDate).getTime();

  // Direct date match
  if (
    (taskEnd >= startOfDay && taskEnd <= endOfDay) ||
    (taskStart >= startOfDay && taskStart <= endOfDay) ||
    (taskStart <= startOfDay && taskEnd >= endOfDay)
  ) {
    return true;
  }

  // Check recurring pattern
  const rule = task.recurrence;
  if (!rule || !rule.enabled) return false;

  const initialStart = new Date(task.startDate);
  const initialStartDay = new Date(initialStart.getFullYear(), initialStart.getMonth(), initialStart.getDate()).getTime();

  // Date must be at or after initial start date
  if (startOfDay < initialStartDay) return false;

  // Check until_date limit if specified
  if (rule.endCondition === 'until_date' && rule.repeatUntilDate) {
    const untilTime = new Date(rule.repeatUntilDate).getTime();
    if (startOfDay > untilTime) return false;
  }

  const interval = Math.max(1, rule.interval || 1);
  const unit = rule.unit;

  if (unit === 'days') {
    const diffDays = Math.round((startOfDay - initialStartDay) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays % interval === 0) {
      if (rule.endCondition === 'count' && rule.repeatCount) {
        if (diffDays / interval >= rule.repeatCount) return false;
      }
      return true;
    }
  } else if (unit === 'weeks') {
    const diffDays = Math.round((startOfDay - initialStartDay) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays % (interval * 7) === 0) {
      if (rule.endCondition === 'count' && rule.repeatCount) {
        if (diffDays / (interval * 7) >= rule.repeatCount) return false;
      }
      return true;
    }
  } else if (unit === 'months') {
    const targetDay = date.getDate();
    const startDayNum = initialStart.getDate();
    const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const expectedDay = Math.min(startDayNum, lastDayOfTargetMonth);

    if (targetDay === expectedDay) {
      const monthDiff = (date.getFullYear() - initialStart.getFullYear()) * 12 + (date.getMonth() - initialStart.getMonth());
      if (monthDiff >= 0 && monthDiff % interval === 0) {
        if (rule.endCondition === 'count' && rule.repeatCount) {
          if (monthDiff / interval >= rule.repeatCount) return false;
        }
        return true;
      }
    }
  } else if (unit === 'years') {
    if (date.getDate() === initialStart.getDate() && date.getMonth() === initialStart.getMonth()) {
      const yearDiff = date.getFullYear() - initialStart.getFullYear();
      if (yearDiff >= 0 && yearDiff % interval === 0) {
        if (rule.endCondition === 'count' && rule.repeatCount) {
          if (yearDiff / interval >= rule.repeatCount) return false;
        }
        return true;
      }
    }
  }

  return false;
}
