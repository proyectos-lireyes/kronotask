import { RecurrenceRule, RecurrenceUnit, TaskItem } from '../types';

export function addWorkdays(d: Date, workdaysToAdd: number): Date {
  const result = new Date(d);
  let added = 0;
  while (added < workdaysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

export function addRecurrenceInterval(d: Date, interval: number, unit: RecurrenceUnit, weekDays?: number[]): Date {
  const result = new Date(d);

  // If specific weekdays are specified (e.g. [1, 2, 4, 5] for Mon, Tue, Thu, Fri)
  if (weekDays && weekDays.length > 0) {
    let checkDate = new Date(d);
    checkDate.setDate(checkDate.getDate() + 1);
    let attempts = 0;
    while (attempts < 14) {
      if (weekDays.includes(checkDate.getDay())) {
        return checkDate;
      }
      checkDate.setDate(checkDate.getDate() + 1);
      attempts++;
    }
  }

  switch (unit) {
    case 'hours':
      result.setHours(result.getHours() + interval);
      break;
    case 'days':
      result.setDate(result.getDate() + interval);
      break;
    case 'workdays':
      return addWorkdays(d, interval);
    case 'weeks':
      result.setDate(result.getDate() + interval * 7);
      break;
    case 'months': {
      const origDay = d.getDate();
      result.setMonth(result.getMonth() + interval);
      // Evitar salto de mes en días como 31 de enero -> fin de febrero
      if (result.getDate() !== origDay) {
        result.setDate(0);
      }
      break;
    }
    case 'years':
      result.setFullYear(result.getFullYear() + interval);
      break;
  }
  return result;
}

export function calculateNextOccurrence(
  currentStart: string,
  currentEnd: string,
  recurrence: RecurrenceRule
): { nextStart: string; nextEnd: string } {
  const start = new Date(currentStart);
  const end = new Date(currentEnd);
  const durationMs = Math.max(1000 * 60 * 30, end.getTime() - start.getTime());

  const nextStart = addRecurrenceInterval(start, recurrence.interval, recurrence.unit, recurrence.weekDays);
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  return {
    nextStart: nextStart.toISOString(),
    nextEnd: nextEnd.toISOString(),
  };
}

export interface OccurrenceDateRange {
  startDate: string;
  endDate: string;
  index: number;
}

/**
 * Calcula todas las ocurrencias de una periodicidad desde la fecha de inicio hasta el límite establecido
 * (fecha fin de periodicidad o número de repeticiones).
 */
export function calculateAllOccurrences(
  startDateIso: string,
  endDateIso: string,
  recurrence: RecurrenceRule,
  maxCap: number = 90
): OccurrenceDateRange[] {
  if (!recurrence || !recurrence.enabled) {
    return [{ startDate: startDateIso, endDate: endDateIso, index: 1 }];
  }

  const start = new Date(startDateIso);
  const end = new Date(endDateIso);
  const durationMs = Math.max(1000 * 60 * 30, end.getTime() - start.getTime());
  const interval = Math.max(1, recurrence.interval || 1);
  const unit = recurrence.unit || 'days';

  const occurrences: OccurrenceDateRange[] = [
    {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      index: 1,
    },
  ];

  let currentStart = new Date(start);
  let currentIndex = 1;

  // Determinar condición de fin
  const endCondition = recurrence.endCondition || (recurrence.repeatCount ? 'count' : recurrence.repeatUntilDate ? 'until_date' : 'until_date');

  let untilTimeMs: number | null = null;
  if (endCondition === 'until_date') {
    if (recurrence.repeatUntilDate) {
      untilTimeMs = new Date(recurrence.repeatUntilDate).getTime();
    } else {
      // Si la fecha de fin de la tarea es mayor que el primer intervalo, usar esa fecha como límite
      const firstCycleNextMs = addRecurrenceInterval(start, interval, unit, recurrence.weekDays).getTime();
      if (end.getTime() > firstCycleNextMs) {
        untilTimeMs = end.getTime();
      } else {
        // Por defecto hasta 3 meses en el futuro
        const defaultUntil = new Date(start);
        defaultUntil.setMonth(defaultUntil.getMonth() + 3);
        untilTimeMs = defaultUntil.getTime();
      }
    }
  }

  // Determinar número máximo de ocurrencias según la condición activa
  let maxCount = maxCap;
  if (endCondition === 'count') {
    maxCount = Math.min(Math.max(1, recurrence.repeatCount || 1), maxCap);
  } else if (endCondition === 'never') {
    maxCount = Math.min(12, maxCap);
  }

  while (currentIndex < maxCount) {
    const nextStart = addRecurrenceInterval(currentStart, interval, unit, recurrence.weekDays);
    const nextEnd = new Date(nextStart.getTime() + durationMs);

    if (untilTimeMs !== null && nextStart.getTime() > untilTimeMs) {
      break;
    }

    currentIndex++;
    occurrences.push({
      startDate: nextStart.toISOString(),
      endDate: nextEnd.toISOString(),
      index: currentIndex,
    });

    currentStart = nextStart;
  }

  return occurrences;
}

/**
 * Genera el conjunto de tareas completas correspondientes a la serie periódica
 */
export function generateRecurringTaskSeries(
  baseTask: TaskItem,
  options?: { seriesId?: string }
): TaskItem[] {
  if (!baseTask.recurrence || !baseTask.recurrence.enabled) {
    return [baseTask];
  }

  const seriesId = options?.seriesId || baseTask.recurrenceSeriesId || `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const occurrences = calculateAllOccurrences(baseTask.startDate, baseTask.endDate, baseTask.recurrence);
  const total = occurrences.length;
  const baseTaskIndex = baseTask.recurrenceIndex || 1;

  const usedIds = new Set<string>();

  return occurrences.map((occ, idx) => {
    const cycleNum = occ.index;
    const isBaseOccurrence = cycleNum === baseTaskIndex || (idx === 0 && !baseTask.recurrenceIndex);

    let taskId: string;
    if (isBaseOccurrence) {
      taskId = baseTask.id;
    } else {
      taskId = `task-${seriesId}-${cycleNum}`;
      if (taskId === baseTask.id || usedIds.has(taskId)) {
        taskId = `task-${seriesId}-${cycleNum}-${idx}`;
      }
    }

    usedIds.add(taskId);

    return {
      ...baseTask,
      id: taskId,
      title: baseTask.title,
      status: isBaseOccurrence ? baseTask.status : 'todo',
      startDate: occ.startDate,
      endDate: occ.endDate,
      completedAt: isBaseOccurrence ? baseTask.completedAt : null,
      recurrence: {
        ...baseTask.recurrence!,
        repeatCount: total,
      },
      recurrenceSeriesId: seriesId,
      recurrenceIndex: cycleNum,
      recurrenceTotal: total,
      createdAt: isBaseOccurrence ? baseTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export type RecurrenceCompletionAction =
  | { type: 'continue' }
  | { type: 'extend'; extraCycles: number }
  | { type: 'finish' };

/**
 * Obtiene las tareas futuras pendientes (no completadas) de la misma serie posteriores a `currentTask`.
 */
export function getFuturePendingSeriesTasks(allTasks: TaskItem[], currentTask: TaskItem): TaskItem[] {
  if (!currentTask.recurrenceSeriesId) return [];
  const currentIdx = currentTask.recurrenceIndex || 0;
  const currentStartMs = new Date(currentTask.startDate).getTime();

  return allTasks.filter((t) => {
    if (t.recurrenceSeriesId !== currentTask.recurrenceSeriesId) return false;
    if (t.id === currentTask.id) return false;
    if (t.status === 'done') return false;

    if (currentIdx > 0 && t.recurrenceIndex) {
      return t.recurrenceIndex > currentIdx;
    }
    return new Date(t.startDate).getTime() > currentStartMs;
  });
}

/**
 * Extiende una serie periódica existente agregando `extraCycles` ciclos adicionales
 * después del último ciclo programado en la serie.
 */
export function extendRecurringSeries(
  allTasks: TaskItem[],
  referenceTask: TaskItem,
  extraCycles: number
): {
  seriesId: string;
  updatedExistingTasks: TaskItem[];
  newlyCreatedTasks: TaskItem[];
  newTotal: number;
} {
  const safeExtra = Math.max(1, Math.min(60, Math.round(extraCycles || 1)));
  const seriesId =
    referenceTask.recurrenceSeriesId ||
    `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const seriesTasks = referenceTask.recurrenceSeriesId
    ? allTasks.filter((t) => t.recurrenceSeriesId === seriesId)
    : [referenceTask];

  const sortedSeries = [...seriesTasks].sort((a, b) => {
    const idxDiff = (a.recurrenceIndex || 0) - (b.recurrenceIndex || 0);
    if (idxDiff !== 0) return idxDiff;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const anchorLastTask = sortedSeries[sortedSeries.length - 1] || referenceTask;
  const maxExistingIndex = sortedSeries.reduce(
    (max, t, idx) => Math.max(max, t.recurrenceIndex || idx + 1),
    1
  );
  const newTotal = maxExistingIndex + safeExtra;

  const baseRule: RecurrenceRule = {
    enabled: true,
    interval: Math.max(1, referenceTask.recurrence?.interval || anchorLastTask.recurrence?.interval || 1),
    unit: referenceTask.recurrence?.unit || anchorLastTask.recurrence?.unit || 'weeks',
    weekDays: referenceTask.recurrence?.weekDays || anchorLastTask.recurrence?.weekDays,
    endCondition:
      referenceTask.recurrence?.endCondition === 'never' ? 'never' : 'count',
    repeatCount: newTotal,
    generateInstances: true,
  };

  const existingIds = new Set(allTasks.map((t) => t.id));
  const newlyCreatedTasks: TaskItem[] = [];

  let curStart = anchorLastTask.startDate;
  let curEnd = anchorLastTask.endDate;
  const nowIso = new Date().toISOString();

  for (let i = 1; i <= safeExtra; i++) {
    const nextIndex = maxExistingIndex + i;
    const { nextStart, nextEnd } = calculateNextOccurrence(curStart, curEnd, baseRule);

    let newId = `task-${seriesId}-${nextIndex}`;
    if (existingIds.has(newId)) {
      newId = `task-${seriesId}-${nextIndex}-${Date.now().toString(36).slice(-4)}`;
    }
    existingIds.add(newId);

    newlyCreatedTasks.push({
      ...referenceTask,
      id: newId,
      status: 'todo',
      waitingSince: null,
      waitingDays: undefined,
      frictionPoints: 0,
      startDate: nextStart,
      endDate: nextEnd,
      completedAt: null,
      completionOutcome: null,
      recurrence: { ...baseRule },
      recurrenceSeriesId: seriesId,
      recurrenceIndex: nextIndex,
      recurrenceTotal: newTotal,
      comments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    curStart = nextStart;
    curEnd = nextEnd;
  }

  // Actualizar los totales y regla de repetición en las tareas existentes de la serie
  const updatedExistingTasks: TaskItem[] = sortedSeries.map((t, idx) => ({
    ...t,
    recurrenceSeriesId: seriesId,
    recurrenceIndex: t.recurrenceIndex || idx + 1,
    recurrenceTotal: newTotal,
    recurrence: t.recurrence
      ? {
          ...t.recurrence,
          enabled: true,
          repeatCount: newTotal,
          endCondition: (t.recurrence.endCondition === 'never' ? 'never' : 'count') as RecurrenceRule['endCondition'],
        }
      : { ...baseRule },
    updatedAt: nowIso,
  }));

  return {
    seriesId,
    updatedExistingTasks,
    newlyCreatedTasks,
    newTotal,
  };
}

/**
 * Detiene el seguimiento de una serie periódica después de `currentTask`,
 * eliminando todas las ocurrencias futuras pendientes y ajustando el total de ciclos.
 */
export function stopRecurringSeriesAfter(
  allTasks: TaskItem[],
  currentTask: TaskItem
): {
  updatedRemainingTasks: TaskItem[];
  removedTaskIds: string[];
  newTotal: number;
} {
  const futurePending = getFuturePendingSeriesTasks(allTasks, currentTask);
  const removedIds = new Set(futurePending.map((t) => t.id));

  const remainingSeriesTasks = currentTask.recurrenceSeriesId
    ? allTasks.filter(
        (t) => t.recurrenceSeriesId === currentTask.recurrenceSeriesId && !removedIds.has(t.id)
      )
    : [currentTask];

  const newTotal = Math.max(
    currentTask.recurrenceIndex || 1,
    remainingSeriesTasks.length
  );
  const nowIso = new Date().toISOString();

  const updatedRemainingTasks: TaskItem[] = remainingSeriesTasks.map((t) => ({
    ...t,
    recurrenceTotal: newTotal,
    recurrence: t.recurrence
      ? {
          ...t.recurrence,
          endCondition: (t.recurrence.endCondition === 'never' ? 'count' : t.recurrence.endCondition) as RecurrenceRule['endCondition'],
          repeatCount: newTotal,
        }
      : undefined,
    updatedAt: nowIso,
  }));

  return {
    updatedRemainingTasks,
    removedTaskIds: Array.from(removedIds),
    newTotal,
  };
}

export function formatRecurrenceLabel(rule?: RecurrenceRule): string {
  if (!rule || !rule.enabled) return 'Sin repetición';
  const { interval, unit, weekDays, endCondition, repeatUntilDate, repeatCount } = rule;

  const dayNamesShort: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    0: 'Dom',
  };

  if (weekDays && weekDays.length > 0) {
    const daysStr = weekDays.map((d) => dayNamesShort[d]).join(', ');
    let baseText = `Días específicos: ${daysStr}`;
    if ((endCondition === 'count' || (!endCondition && repeatCount)) && repeatCount) {
      baseText += ` · ${repeatCount} repeticiones`;
    } else if (endCondition === 'until_date' && repeatUntilDate) {
      const d = new Date(repeatUntilDate);
      const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      baseText += ` · Hasta ${dateStr}`;
    } else if (repeatCount) {
      baseText += ` · ${repeatCount} repeticiones`;
    }
    return baseText;
  }

  const unitMap: Record<RecurrenceUnit, { singular: string; plural: string }> = {
    hours: { singular: 'hora', plural: 'horas' },
    days: { singular: 'día', plural: 'días' },
    workdays: { singular: 'día hábil', plural: 'días hábiles' },
    weeks: { singular: 'semana', plural: 'semanas' },
    months: { singular: 'mes', plural: 'meses' },
    years: { singular: 'año', plural: 'años' },
  };

  const label = interval === 1 ? unitMap[unit].singular : `${interval} ${unitMap[unit].plural}`;
  let baseText = `Cada ${label}`;

  if ((endCondition === 'count' || (!endCondition && repeatCount)) && repeatCount) {
    baseText += ` · ${repeatCount} repeticiones`;
  } else if (endCondition === 'until_date' && repeatUntilDate) {
    const d = new Date(repeatUntilDate);
    const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    baseText += ` · Hasta ${dateStr}`;
  } else if (repeatCount) {
    baseText += ` · ${repeatCount} repeticiones`;
  }

  return baseText;
}

export function isTaskOccurringOnDate(task: TaskItem, date: Date): boolean {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const taskStart = new Date(task.startDate).getTime();
  const taskEnd = new Date(task.endDate).getTime();

  // Coincidencia directa con fecha de esta tarea
  if (
    (taskEnd >= startOfDay && taskEnd <= endOfDay) ||
    (taskStart >= startOfDay && taskStart <= endOfDay) ||
    (taskStart <= startOfDay && taskEnd >= endOfDay)
  ) {
    return true;
  }

  // Si la tarea tiene tareas hijas de la serie generadas en el sistema,
  // cada una ya tiene sus fechas individuales.
  // Solo evaluamos el patrón recurrente si la tarea es única y no tiene serie generada.
  if (task.recurrenceSeriesId && task.recurrenceTotal && task.recurrenceTotal > 1) {
    return false;
  }

  const rule = task.recurrence;
  if (!rule || !rule.enabled) return false;

  const initialStart = new Date(task.startDate);
  const initialStartDay = new Date(initialStart.getFullYear(), initialStart.getMonth(), initialStart.getDate()).getTime();

  if (startOfDay < initialStartDay) return false;

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
