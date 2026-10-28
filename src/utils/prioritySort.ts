import { TaskItem, CustomPriorityDefinition, TaskStatus, QuadrantConfig, DEFAULT_QUADRANT_CONFIG } from '../types';
import { calculateTimeLevel } from './timeColor';

export interface TaskStatusMismatch {
  isMismatched: boolean;
  suggestedStatus: TaskStatus;
  suggestedStatusLabel: string;
  badgeLabel: string;
  badgeColor: string;
  reason: string;
  urgencyLevel: 'critical' | 'high' | 'medium';
}

/**
 * Calculates whether a task's current status is inconsistent with its start date,
 * end date, and current time.
 */
export function detectTaskStatusMismatch(
  task: TaskItem,
  now: number = Date.now()
): TaskStatusMismatch {
  if (task.status === 'done') {
    return {
      isMismatched: false,
      suggestedStatus: 'done',
      suggestedStatusLabel: 'Completada',
      badgeLabel: '',
      badgeColor: '',
      reason: '',
      urgencyLevel: 'medium',
    };
  }

  const startMs = new Date(task.startDate).getTime();
  const endMs = new Date(task.endDate).getTime();
  const totalDuration = Math.max(60000, endMs - startMs);
  const remainingMs = endMs - now;

  // 1. Deadline Exceeded (Overdue)
  if (now >= endMs) {
    return {
      isMismatched: true,
      suggestedStatus: 'in_progress',
      suggestedStatusLabel: 'En Progreso (Atención Inmediata)',
      badgeLabel: '🚨 Vencida: Mover a En Progreso',
      badgeColor: 'bg-stone-900 text-amber-300 border-stone-800 hover:bg-stone-800 dark:bg-stone-900 dark:text-amber-200',
      reason: 'La fecha y hora de entrega ha transcurrido. Requiere acción inmediata.',
      urgencyLevel: 'critical',
    };
  }

  // 2. Scheduled Execution Window Active (Start Date passed) but task still in 'todo'
  if (now >= startMs && task.status === 'todo') {
    return {
      isMismatched: true,
      suggestedStatus: 'in_progress',
      suggestedStatusLabel: 'En Progreso',
      badgeLabel: '⚡ Plazo Activo (Debería estar En Progreso)',
      badgeColor: 'bg-amber-500/15 text-amber-900 border-amber-300/80 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200',
      reason: 'La fecha de inicio de esta tarea ya transcurrió; el plazo de ejecución está activo.',
      urgencyLevel: 'high',
    };
  }

  // 3. Imminent Delivery (less than half duration remains or under 4 hours) but task still in 'todo'
  if (task.status === 'todo') {
    const isImminent = remainingMs <= Math.max(totalDuration * 0.5, 4 * 3600 * 1000);
    if (isImminent) {
      return {
        isMismatched: true,
        suggestedStatus: 'in_progress',
        suggestedStatusLabel: 'En Progreso',
        badgeLabel: '⏰ Entrega Cercana (Iniciar Ya)',
        badgeColor: 'bg-orange-500/15 text-orange-900 border-orange-300/80 hover:bg-orange-500/25 dark:bg-orange-500/20 dark:text-orange-200',
        reason: 'Falta poco tiempo para la fecha de entrega. El sistema recomienda iniciarla.',
        urgencyLevel: 'high',
      };
    }
  }

  // 4. In 'waiting' status but overdue
  if (task.status === 'waiting' && now >= endMs) {
    return {
      isMismatched: true,
      suggestedStatus: 'in_progress',
      suggestedStatusLabel: 'En Progreso',
      badgeLabel: '⚡ Vencida en Espera (Reanudar)',
      badgeColor: 'bg-purple-500/15 text-purple-900 border-purple-300/80 hover:bg-purple-500/25 dark:bg-purple-500/20 dark:text-purple-200',
      reason: 'La tarea estaba en espera pero el plazo de entrega ya caducó.',
      urgencyLevel: 'critical',
    };
  }

  return {
    isMismatched: false,
    suggestedStatus: task.status,
    suggestedStatusLabel: task.status,
    badgeLabel: '',
    badgeColor: '',
    reason: '',
    urgencyLevel: 'medium',
  };
}

export interface TaskUrgencyDetails {
  percentElapsed: number;
  effectiveUrgency: number;
  urgencyCategory: 'high' | 'medium' | 'low';
  priorityLevelNum: number;
  priorityCategory: 'high' | 'medium' | 'low';
  score: number;
  quadrantNumber: number;
  mismatch: TaskStatusMismatch;
  targetHours: number;
  criticidad: number;
  isQ6DirectToQ2Alert: boolean;
  isOverdue: boolean;
  hoursOverdue: number;
}

/**
 * Returns the timestamp for the end of the next Sunday (23:59:59.999).
 * If today is Sunday, it returns the end of today.
 */
export function getNextSundayEnd(nowMs: number = Date.now()): number {
  const date = new Date(nowMs);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + daysUntilSunday,
    23,
    59,
    59,
    999
  );
  return sunday.getTime();
}

/**
 * Direct Quadrant calculation (1 to 9) using customizable thresholds in QuadrantConfig
 */
export function getQuadrantForTask(
  task: TaskItem,
  nowMs: number = Date.now(),
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): number {
  if (task.status === 'done') return 9;

  const startMs = new Date(task.startDate).getTime();
  const endMs = new Date(task.endDate).getTime();
  const nextSundayEnd = getNextSundayEnd(nowMs);

  const isStarted =
    !isNaN(startMs) &&
    (nowMs >= startMs ||
      task.status === 'in_progress' ||
      task.status === 'in_review' ||
      task.status === 'waiting');

  const msInQ7 = (config.q7DaysPostSunday || 15) * 24 * 60 * 60 * 1000;
  const msInQ8 = (config.q8DaysPostSunday || 30) * 24 * 60 * 60 * 1000;

  if (!isStarted) {
    // Planificación
    const q6End = config.q6UseNextSunday
      ? nextSundayEnd
      : nowMs + (config.q6CustomDays || 7) * 24 * 60 * 60 * 1000;

    if (startMs <= q6End) return 6;
    if (startMs <= nextSundayEnd + msInQ7) return 7;
    if (startMs <= nextSundayEnd + msInQ8) return 8;
    return 9;
  } else {
    // Ejecución
    const daysUntilEnd = (endMs - nowMs) / (1000 * 60 * 60 * 24);
    const isOverdue = nowMs >= endMs;

    const q2End = config.q2UseNextSunday
      ? nextSundayEnd
      : nowMs + (config.q2CustomDays || 7) * 24 * 60 * 60 * 1000;
    const q3End = nextSundayEnd + (config.q3DaysPostSunday || 15) * 24 * 60 * 60 * 1000;
    const q4End = nextSundayEnd + (config.q4DaysPostSunday || 30) * 24 * 60 * 60 * 1000;

    if (isOverdue || daysUntilEnd < (config.q1Days || 4)) return 1;
    if (endMs <= q2End) return 2;
    if (endMs <= q3End) return 3;
    if (endMs <= q4End) return 4;
    return 5;
  }
}

export interface QuadrantColorStyle {
  borderLeft: string;
  borderColor: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
  accentText: string;
  hoverBg: string;
}

export function getQuadrantStyle(quadrantNumber: number): QuadrantColorStyle {
  switch (quadrantNumber) {
    case 1:
      return {
        borderLeft: 'border-l-rose-600',
        borderColor: 'border-rose-300',
        bgLight: 'bg-rose-50/95',
        hoverBg: 'hover:bg-rose-100/90',
        badgeBg: 'bg-rose-600',
        badgeText: 'text-white',
        accentText: 'text-rose-700',
      };
    case 2:
      return {
        borderLeft: 'border-l-amber-600',
        borderColor: 'border-amber-300',
        bgLight: 'bg-amber-50/95',
        hoverBg: 'hover:bg-amber-100/90',
        badgeBg: 'bg-amber-600',
        badgeText: 'text-white',
        accentText: 'text-amber-700',
      };
    case 3:
      return {
        borderLeft: 'border-l-blue-600',
        borderColor: 'border-blue-300',
        bgLight: 'bg-blue-50/95',
        hoverBg: 'hover:bg-blue-100/90',
        badgeBg: 'bg-blue-600',
        badgeText: 'text-white',
        accentText: 'text-blue-700',
      };
    case 4:
      return {
        borderLeft: 'border-l-orange-500',
        borderColor: 'border-orange-300',
        bgLight: 'bg-orange-50/95',
        hoverBg: 'hover:bg-orange-100/90',
        badgeBg: 'bg-orange-500',
        badgeText: 'text-white',
        accentText: 'text-orange-700',
      };
    case 5:
      return {
        borderLeft: 'border-l-yellow-500',
        borderColor: 'border-yellow-300',
        bgLight: 'bg-yellow-50/95',
        hoverBg: 'hover:bg-yellow-100/90',
        badgeBg: 'bg-yellow-500',
        badgeText: 'text-white',
        accentText: 'text-yellow-800',
      };
    case 6:
      return {
        borderLeft: 'border-l-sky-500',
        borderColor: 'border-sky-300',
        bgLight: 'bg-sky-50/95',
        hoverBg: 'hover:bg-sky-100/90',
        badgeBg: 'bg-sky-600',
        badgeText: 'text-white',
        accentText: 'text-sky-700',
      };
    case 7:
      return {
        borderLeft: 'border-l-stone-600',
        borderColor: 'border-stone-300',
        bgLight: 'bg-stone-100/95',
        hoverBg: 'hover:bg-stone-200/90',
        badgeBg: 'bg-stone-700',
        badgeText: 'text-white',
        accentText: 'text-stone-700',
      };
    case 8:
      return {
        borderLeft: 'border-l-slate-500',
        borderColor: 'border-slate-300',
        bgLight: 'bg-slate-50/95',
        hoverBg: 'hover:bg-slate-100/90',
        badgeBg: 'bg-slate-600',
        badgeText: 'text-white',
        accentText: 'text-slate-700',
      };
    case 9:
    default:
      return {
        borderLeft: 'border-l-slate-400',
        borderColor: 'border-slate-200',
        bgLight: 'bg-slate-50/80',
        hoverBg: 'hover:bg-slate-100/80',
        badgeBg: 'bg-slate-400',
        badgeText: 'text-white',
        accentText: 'text-slate-600',
      };
  }
}

/**
 * Calculates complete urgency and importance details for a task
 */
export function calculateTaskUrgencyInfo(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[],
  now: number = Date.now(),
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): TaskUrgencyDetails {
  const isDone = task.status === 'done';
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);
  const percentElapsed = isNaN(timeCalc.percentElapsed) ? 0 : timeCalc.percentElapsed;

  const startMs = new Date(task.startDate).getTime();
  const endMs = new Date(task.endDate).getTime();
  const nextSundayEnd = getNextSundayEnd(now);

  const isStarted =
    !isDone &&
    !isNaN(startMs) &&
    (now >= startMs ||
      task.status === 'in_progress' ||
      task.status === 'in_review' ||
      task.status === 'waiting');

  const mismatch = detectTaskStatusMismatch(task, now);

  // Criticidad (1 a 5)
  let criticidad = 2; // Default Media
  const taskPriorityStr = (task.priority || 'media').toLowerCase();
  const matched = allPriorities?.find(
    (p) =>
      p.id?.toLowerCase() === taskPriorityStr ||
      p.name?.toLowerCase() === taskPriorityStr
  );

  if (matched && typeof matched.level === 'number' && !isNaN(matched.level)) {
    criticidad = matched.level;
  } else {
    const norm = taskPriorityStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('critica') || norm.includes('critical') || norm === '5') criticidad = 5;
    else if (norm.includes('urgente') || norm.includes('urgent') || norm === '4') criticidad = 4;
    else if (norm.includes('alta') || norm.includes('high') || norm === '3') criticidad = 3;
    else if (norm.includes('baja') || norm.includes('low') || norm === '1') criticidad = 1;
    else criticidad = 2;
  }

  const quadrantNumber = getQuadrantForTask(task, now, config);

  // Target hours / remaining hours calculation
  const targetHours = isStarted
    ? (endMs - now) / (1000 * 60 * 60)
    : (startMs - now) / (1000 * 60 * 60);

  const isOverdue = now >= endMs && !isDone;
  const hoursOverdue = isOverdue ? (now - endMs) / (1000 * 60 * 60) : 0;

  // Formula exact mathematical calculation
  let rawScore = 0;
  if (isDone) {
    rawScore = 0;
  } else if (targetHours >= 0) {
    rawScore = criticidad / (targetHours + 1);
  } else {
    const hoursOverdueAbs = Math.abs(targetHours);
    rawScore = 100 + criticidad * hoursOverdueAbs;
  }

  const score = Math.round(rawScore * 100) / 100;

  // Q6 alert condition
  const q6End = config.q6UseNextSunday ? nextSundayEnd : now + (config.q6CustomDays || 7) * 24 * 60 * 60 * 1000;
  const isQ6DirectToQ2Alert =
    !isStarted && startMs <= q6End && endMs <= nextSundayEnd;

  let urgencyCategory: 'high' | 'medium' | 'low' = 'low';
  if (quadrantNumber <= 3) urgencyCategory = 'high';
  else if (quadrantNumber <= 6) urgencyCategory = 'medium';
  else urgencyCategory = 'low';

  let priorityCategory: 'high' | 'medium' | 'low' = 'medium';
  if (criticidad >= 4) priorityCategory = 'high';
  else if (criticidad >= 2) priorityCategory = 'medium';
  else priorityCategory = 'low';

  return {
    percentElapsed,
    effectiveUrgency: score,
    urgencyCategory,
    priorityLevelNum: criticidad,
    priorityCategory,
    score,
    quadrantNumber,
    mismatch,
    targetHours: Math.max(0, targetHours),
    criticidad,
    isQ6DirectToQ2Alert,
    isOverdue,
    hoursOverdue,
  };
}

/**
 * Calculates the exact Relative Priority Score for a task.
 */
export function getTaskPriorityScore(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[],
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): number {
  return calculateTaskUrgencyInfo(task, allPriorities, Date.now(), config).score;
}

/**
 * Primary sort: Closest End Date
 */
export function sortTasksByDeadlineAndPriority(
  tasks: TaskItem[],
  allPriorities?: CustomPriorityDefinition[],
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const endA = new Date(a.endDate).getTime();
    const endB = new Date(b.endDate).getTime();

    if (endA !== endB) {
      return endA - endB;
    }

    const scoreA = getTaskPriorityScore(a, allPriorities, config);
    const scoreB = getTaskPriorityScore(b, allPriorities, config);
    return scoreB - scoreA;
  });
}

/**
 * Sorts tasks within quadrants
 */
export function sortTasksByPriorityAndUrgency(
  tasks: TaskItem[],
  allPriorities?: CustomPriorityDefinition[],
  now: number = Date.now(),
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): TaskItem[] {
  const mapped = tasks.map((t) => ({
    task: t,
    info: calculateTaskUrgencyInfo(t, allPriorities, now, config),
  }));

  mapped.sort((a, b) => {
    // 1. Regla especial Q6
    if (a.info.quadrantNumber === 6 && b.info.quadrantNumber === 6) {
      if (a.info.isQ6DirectToQ2Alert && !b.info.isQ6DirectToQ2Alert) return -1;
      if (!a.info.isQ6DirectToQ2Alert && b.info.isQ6DirectToQ2Alert) return 1;
    }

    // 2. Mayor puntuación primero
    if (b.info.score !== a.info.score) {
      return b.info.score - a.info.score;
    }

    // 3. Desempate por fecha fin
    const endMsA = new Date(a.task.endDate).getTime();
    const endMsB = new Date(b.task.endDate).getTime();
    return endMsA - endMsB;
  });

  return mapped.map((item) => item.task);
}


