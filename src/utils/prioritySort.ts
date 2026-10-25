import { TaskItem, CustomPriorityDefinition } from '../types';
import { calculateTimeLevel } from './timeColor';

/**
 * Calculates the exact Relative Priority Score for a task.
 * Score = (Priority Level * 20) + Percent Time Elapsed
 */
export function getTaskPriorityScore(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[]
): number {
  const isDone = task.status === 'done';
  const now = Date.now();
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);

  let percentElapsed = timeCalc.percentElapsed;
  let overdueBonus = 0;
  if (timeCalc.isOverdue && !isDone) {
    percentElapsed = 100;
    overdueBonus = 20;
  }

  // Start Date Imminence / Active Bonus
  let startBonus = 0;
  if (!isDone) {
    const startMs = new Date(task.startDate).getTime();
    if (now >= startMs) {
      // Task is active or past its start time
      startBonus = 15;
    } else {
      const diffHours = (startMs - now) / (1000 * 3600);
      if (diffHours <= 12) {
        startBonus = 10;
      } else if (diffHours <= 24) {
        startBonus = 5;
      }
    }
  }

  // Priority level 1 to 5
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

  const urgencyScore = percentElapsed + startBonus + overdueBonus;
  return pLevelNum * 20 + urgencyScore;
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
