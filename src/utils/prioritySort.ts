import { TaskItem, CustomPriorityDefinition } from '../types';
import { calculateTimeLevel } from './timeColor';

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
  const isStarted = !isDone && now >= startMs;

  const hoursUntilStart = (startMs - now) / (1000 * 3600);
  const hoursUntilEnd = (endMs - now) / (1000 * 3600);

  // 1. Start Date / Imminence Bonus
  let startBonus = 0;
  if (!isDone) {
    if (isStarted) {
      startBonus = 25;
    } else if (hoursUntilStart <= 6) {
      startBonus = 30;
    } else if (hoursUntilStart <= 12) {
      startBonus = 25;
    } else if (hoursUntilStart <= 24) {
      startBonus = 20;
    } else if (hoursUntilStart <= 48) {
      startBonus = 12;
    } else if (hoursUntilStart <= 72) {
      startBonus = 5;
    }
  }

  // 2. Deadline Proximity Bonus
  let deadlineBonus = 0;
  if (!isDone) {
    if (isOverdue) {
      deadlineBonus = 50;
    } else if (hoursUntilEnd <= 12) {
      deadlineBonus = 35;
    } else if (hoursUntilEnd <= 24) {
      deadlineBonus = 25;
    } else if (hoursUntilEnd <= 48) {
      deadlineBonus = 15;
    } else if (hoursUntilEnd <= 72) {
      deadlineBonus = 8;
    }
  }

  // 3. Status Bonus
  let statusBonus = 0;
  if (task.status === 'in_progress') {
    statusBonus = 20;
  } else if (task.status === 'waiting') {
    statusBonus = 10;
  }

  const effectiveUrgency = Math.min(100, Math.max(0, percentElapsed)) + startBonus + deadlineBonus + statusBonus;

  // Categorize Urgency ('high' | 'medium' | 'low')
  let urgencyCategory: 'high' | 'medium' | 'low' = 'low';

  if (isOverdue || percentElapsed >= 75 || hoursUntilEnd <= 24 || effectiveUrgency >= 75) {
    urgencyCategory = 'high';
  } else if (
    percentElapsed >= 40 ||
    task.status === 'in_progress' ||
    isStarted ||
    (hoursUntilStart > 0 && hoursUntilStart <= 24) ||
    (hoursUntilEnd > 0 && hoursUntilEnd <= 48) ||
    effectiveUrgency >= 35
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
  if (pLevelNum >= 3) priorityCategory = 'high';
  else if (pLevelNum === 2) priorityCategory = 'medium';
  else priorityCategory = 'low';

  const score = pLevelNum * 20 + effectiveUrgency;

  return {
    percentElapsed,
    effectiveUrgency,
    urgencyCategory,
    priorityLevelNum: pLevelNum,
    priorityCategory,
    score,
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
