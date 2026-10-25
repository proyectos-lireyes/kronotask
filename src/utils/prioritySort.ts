import { TaskItem, CustomPriorityDefinition, TaskStatus } from '../types';
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
 * end date, and current time. For example, if start date has passed or end date is near,
 * the task should NOT remain in "Por Hacer" (todo).
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

/**
 * Calculates the exact Relative Priority Score for a task.
 * Score = (Priority Level * 20) + Percent Time Elapsed
 */
export interface TaskUrgencyDetails {
  percentElapsed: number;
  effectiveUrgency: number;
  urgencyCategory: 'high' | 'medium' | 'low';
  priorityLevelNum: number;
  priorityCategory: 'high' | 'medium' | 'low';
  score: number;
  mismatch: TaskStatusMismatch;
}

/**
 * Calculates complete urgency and importance details for a task,
 * confirming status, priority, current time, start date, and end date.
 */
export function calculateTaskUrgencyInfo(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[],
  now: number = Date.now()
): TaskUrgencyDetails {
  const isDone = task.status === 'done';
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);

  const percentElapsed = timeCalc.percentElapsed;
  const isOverdue = timeCalc.isOverdue && !isDone;

  const startMs = new Date(task.startDate).getTime();
  const endMs = new Date(task.endDate).getTime();
  const totalDurationMs = Math.max(60000, endMs - startMs);
  const remainingMs = endMs - now;
  const isStarted = !isDone && now >= startMs;

  const mismatch = detectTaskStatusMismatch(task, now);

  // 1. Start Date / Execution Window Bonus
  let startBonus = 0;
  if (!isDone) {
    if (isStarted) {
      startBonus = 30;
    } else if (startMs - now <= totalDurationMs * 0.25) {
      startBonus = 20;
    } else if (startMs - now <= totalDurationMs * 0.5) {
      startBonus = 12;
    }
  }

  // 2. Deadline Proximity Bonus (ratio of time remaining)
  let deadlineBonus = 0;
  if (!isDone) {
    if (isOverdue) {
      deadlineBonus = 50;
    } else {
      const remainingRatio = remainingMs / totalDurationMs;
      if (remainingRatio <= 0.25) {
        deadlineBonus = 35;
      } else if (remainingRatio <= 0.5) {
        deadlineBonus = 25;
      } else if (remainingRatio <= 0.75) {
        deadlineBonus = 12;
      }
    }
  }

  // 3. Status Mismatch Bonus (if start date passed or delivery imminent but stuck in 'todo')
  let statusBonus = 0;
  if (task.status === 'in_progress') {
    statusBonus = 20;
  } else if (task.status === 'waiting') {
    statusBonus = 10;
  } else if (mismatch.isMismatched) {
    statusBonus = 25;
  }

  const effectiveUrgency = Math.min(100, Math.max(0, percentElapsed)) + startBonus + deadlineBonus + statusBonus;

  // Categorize Urgency ('high' | 'medium' | 'low')
  let urgencyCategory: 'high' | 'medium' | 'low' = 'low';

  if (
    isOverdue ||
    percentElapsed >= 75 ||
    mismatch.isMismatched ||
    isStarted ||
    remainingMs <= Math.max(totalDurationMs * 0.5, 4 * 3600 * 1000) ||
    effectiveUrgency >= 65
  ) {
    urgencyCategory = 'high';
  } else if (
    percentElapsed >= 35 ||
    task.status === 'in_progress' ||
    effectiveUrgency >= 30
  ) {
    urgencyCategory = 'medium';
  } else {
    urgencyCategory = 'low';
  }

  // Priority Level mapping
  let pLevelNum = 2; // Default Media
  const matched = allPriorities?.find(
    (p) =>
      p.id.toLowerCase() === task.priority.toLowerCase() ||
      p.name.toLowerCase() === task.priority.toLowerCase()
  );

  if (matched) {
    pLevelNum = matched.level;
  } else {
    const norm = task.priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('critica') || norm.includes('critical') || norm === '5') pLevelNum = 5;
    else if (norm.includes('urgente') || norm.includes('urgent') || norm === '4') pLevelNum = 4;
    else if (norm.includes('alta') || norm.includes('high') || norm === '3') pLevelNum = 3;
    else if (norm.includes('baja') || norm.includes('low') || norm === '1') pLevelNum = 1;
    else pLevelNum = 2;
  }

  let priorityCategory: 'high' | 'medium' | 'low' = 'medium';
  if (pLevelNum >= 3 || (remainingMs > 0 && remainingMs <= totalDurationMs * 0.5) || (isOverdue && !isDone)) {
    priorityCategory = 'high';
  } else if (pLevelNum === 2) {
    priorityCategory = 'medium';
  } else {
    priorityCategory = 'low';
  }

  const score = pLevelNum * 20 + effectiveUrgency;

  return {
    percentElapsed,
    effectiveUrgency,
    urgencyCategory,
    priorityLevelNum: pLevelNum,
    priorityCategory,
    score,
    mismatch,
  };
}

/**
 * Calculates the exact Relative Priority Score for a task.
 */
export function getTaskPriorityScore(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[]
): number {
  return calculateTaskUrgencyInfo(task, allPriorities).score;
}

/**
 * Primary sort: Closest End Date (Fecha de Entrega más cercana primero).
 * Secondary sort: Higher Priority Level / Score first for tied dates.
 */
export function sortTasksByDeadlineAndPriority(
  tasks: TaskItem[],
  allPriorities?: CustomPriorityDefinition[]
): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const endA = new Date(a.endDate).getTime();
    const endB = new Date(b.endDate).getTime();

    if (endA !== endB) {
      return endA - endB;
    }

    const scoreA = getTaskPriorityScore(a, allPriorities);
    const scoreB = getTaskPriorityScore(b, allPriorities);
    return scoreB - scoreA;
  });
}

/**
 * Sorts tasks strictly by Relative Priority Score first (highest priority + urgency first),
 * then by earliest delivery date, then by earliest start date.
 */
export function sortTasksByPriorityAndUrgency(
  tasks: TaskItem[],
  allPriorities?: CustomPriorityDefinition[]
): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const scoreA = getTaskPriorityScore(a, allPriorities);
    const scoreB = getTaskPriorityScore(b, allPriorities);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const endA = new Date(a.endDate).getTime();
    const endB = new Date(b.endDate).getTime();
    if (endA !== endB) return endA - endB;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}
