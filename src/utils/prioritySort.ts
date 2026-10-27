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
  quadrantNumber: number;
  mismatch: TaskStatusMismatch;
}

/**
 * Retorna el cuadrante (1 a 9) según la Matriz 3x3 del Algoritmo de ~170 Puntos:
 *
 * Zona de Planificación (Antes de la fecha de inicio, 0 a 35 pts)
 * Q9: 0 - 15 pts (Tareas recién creadas / primer tercio de espera)
 * Q8: 16 - 25 pts (Tareas acercándose a la fecha de inicio)
 * Q7: 26 - 35 pts (Listas para arrancar / base de 30 pts de tiempo + prioridad)
 *
 * Zona de Ejecución (Después de la fecha de inicio o activas, 36 a 136+ pts)
 * Q6: 36 - 55 pts (Primer 20% de avance / flujo inicial)
 * Q5: 56 - 75 pts (El núcleo de trabajo activo: 30% al 40% de avance)
 * Q4: 76 - 95 pts (Tareas maduras: 50% al 60% de avance)
 * Q3: 96 - 115 pts (Recta final: 70% al 80% de avance)
 * Q2: 116 - 135 pts (Al límite: 90%+ o alta prioridad con bloqueos acumulados)
 * Q1: 136+ pts (Día límite de entrega: 130 pts de tiempo + prioridad o vencidas)
 */
export function getQuadrantFromScore(score: number): number {
  if (isNaN(score)) return 9;
  if (score >= 136) return 1;
  if (score >= 116) return 2;
  if (score >= 96) return 3;
  if (score >= 76) return 4;
  if (score >= 56) return 5;
  if (score >= 36) return 6;
  if (score >= 26) return 7;
  if (score >= 16) return 8;
  return 9;
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
 * Calculates complete urgency and importance details for a task,
 * implementing the 140-point frontier (Fase 1: Planificación, Fase 2: Ejecución)
 * and cumulative friction history.
 */
export function calculateTaskUrgencyInfo(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[],
  now: number = Date.now()
): TaskUrgencyDetails {
  const isDone = task.status === 'done';
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);

  const percentElapsed = isNaN(timeCalc.percentElapsed) ? 0 : timeCalc.percentElapsed;
  const isOverdue = timeCalc.isOverdue && !isDone;

  const startMs = new Date(task.startDate).getTime();
  const endMs = new Date(task.endDate).getTime();
  const totalDurationMs = Math.max(60000, isNaN(endMs - startMs) ? 60000 : endMs - startMs);
  const remainingMs = isNaN(endMs) ? 0 : endMs - now;
  const isStarted = !isDone && !isNaN(startMs) && (now >= startMs || task.status === 'in_progress' || task.status === 'in_review' || task.status === 'waiting');

  const mismatch = detectTaskStatusMismatch(task, now);

  // 1. DIMENSIÓN PRIORIDAD (Base nominal: 10 a 50 puntos)
  let pLevelNum = 2; // Default Media (20 pts)
  const taskPriorityStr = (task.priority || 'media').toLowerCase();
  const matched = allPriorities?.find(
    (p) =>
      p.id?.toLowerCase() === taskPriorityStr ||
      p.name?.toLowerCase() === taskPriorityStr
  );

  if (matched && typeof matched.level === 'number' && !isNaN(matched.level)) {
    pLevelNum = matched.level;
  } else {
    const norm = taskPriorityStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('critica') || norm.includes('critical') || norm === '5') pLevelNum = 5;
    else if (norm.includes('urgente') || norm.includes('urgent') || norm === '4') pLevelNum = 4;
    else if (norm.includes('alta') || norm.includes('high') || norm === '3') pLevelNum = 3;
    else if (norm.includes('baja') || norm.includes('low') || norm === '1') pLevelNum = 1;
    else pLevelNum = 2;
  }
  // 1. PRIORIDAD (Empuje relativo: 0 a 20 puntos)
  // Baja: 0 pts, Media: 5 pts, Alta: 10 pts, Urgente: 15 pts, Crítica: 20 pts
  let priorityPoints = 5; // Default Media (5 pts)
  if (pLevelNum === 1) priorityPoints = 0;
  else if (pLevelNum === 2) priorityPoints = 5;
  else if (pLevelNum === 3) priorityPoints = 10;
  else if (pLevelNum === 4) priorityPoints = 15;
  else if (pLevelNum === 5) priorityPoints = 20;

  // 2. ESTADOS & HISTORIAL DE FRICCIÓN (Acumulativo)
  // Por hacer (a tiempo): 0 pts
  // En progreso: +2 pts (Suma mínima por estar activa)
  // En espera (Bloqueada): +5 pts (Sucia la tarea; si pasa varias veces, acumula)
  // En revisión: +5 pts (Cuello de botella técnico)
  // Por hacer (atrasada): +10 pts (Penalización por no arrancar a tiempo)
  const accumulatedFriction = Math.max(0, task.frictionPoints || 0);
  const waitingFriction = Math.max(accumulatedFriction, task.status === 'waiting' ? 5 : 0);

  let rawScore = 0;

  if (isDone) {
    rawScore = 0;
  } else if (!isStarted) {
    // ========================================================
    // FASE 1: PREPARACIÓN (0 a 40 pts)
    // 0% - 30% del tiempo para iniciar: 10 pts (Q9)
    // 31% - 60% del tiempo para iniciar: 20 pts (Q8)
    // 61% - 90% del tiempo para iniciar: 30 pts (Q7)
    // 91% - 100% ("Prontas" a iniciar): 40 pts (Entran a Q6 como pre-embarque/transición)
    // ========================================================
    const timeUntilStartMs = Math.max(0, startMs - now);
    const createdMs = task.createdAt ? new Date(task.createdAt).getTime() : NaN;
    let prepRatio = 0.5;
    if (!isNaN(createdMs) && createdMs < startMs) {
      const totalPrepMs = Math.max(60000, startMs - createdMs);
      prepRatio = Math.max(0, Math.min(1, (now - createdMs) / totalPrepMs));
    } else {
      const horizonMs = Math.max(7 * 24 * 60 * 60 * 1000, totalDurationMs);
      prepRatio = Math.max(0, Math.min(1, 1 - (timeUntilStartMs / horizonMs)));
    }

    let prepTimePoints = 10;
    if (prepRatio <= 0.30) {
      prepTimePoints = 10;
    } else if (prepRatio <= 0.60) {
      prepTimePoints = 20;
    } else if (prepRatio <= 0.90) {
      prepTimePoints = 30;
    } else {
      prepTimePoints = 40; // Prontas a iniciar hoy: 40 pts (sala de pre-embarque en Q6)
    }

    rawScore = prepTimePoints + priorityPoints;
    // Si aún no inicia pero es pronta (prepTimePoints = 40), convive en Q6 (hasta 55 pts con prioridad)
    if (prepTimePoints === 40) {
      rawScore = Math.min(55, Math.max(36, rawScore));
    } else {
      rawScore = Math.min(35, Math.max(0, rawScore));
    }
  } else {
    // ========================================================
    // FASE 2: EJECUCIÓN (50 a 130 pts)
    // ¡Tarea Iniciada! (0% a 10% de ejecución): Base de tiempo 50 pts (+10 pts diferenciador).
    // De 10% a 100% de ejecución: escala hasta 130 pts.
    // Piso Nominal de Duración (Microtareas y Tareas Cortas):
    // - Micro-tareas (< 24h): +30 pts extra (nacen en Q4 con ~85 pts)
    // - Tareas cortas (1 a 3 días / 24h a 72h): +15 pts extra (nacen en Q5 con ~70 pts)
    // - Tareas largas (> 3 días / 72h): +0 pts (recorren todo el camino lentamente en Q6)
    // ========================================================
    const clampedElapsed = Math.max(0, Math.min(100, percentElapsed));
    let timePoints = 50;
    if (clampedElapsed > 10) {
      timePoints = 50 + ((clampedElapsed - 10) / 90) * 80; // 50 al 10%, 130 al 100%
    }

    // Piso Nominal de Duración (Desempate por tamaño de ventana)
    const durationHours = totalDurationMs / (1000 * 60 * 60);
    let durationBonus = 0;
    if (durationHours < 24) {
      durationBonus = 30; // Micro-tarea (< 24 horas): Salta directo a Q4 (~85 pts)
    } else if (durationHours <= 72) {
      durationBonus = 15; // Tarea corta (1 a 3 días): Salta a Q5 (~70 pts)
    }

    // Estados actuales
    let statePoints = 0;
    if (task.status === 'in_progress') {
      statePoints = 2; // +2 pts por estar activa
    } else if (task.status === 'in_review') {
      statePoints = 5; // +5 pts cuello de botella técnico
    } else if (task.status === 'waiting') {
      statePoints = 5; // +5 pts bloqueada
    } else if (task.status === 'todo' && now >= startMs) {
      statePoints = 10; // +10 pts atrasada sin arrancar a tiempo
    }

    // Vencimiento o entrega inminente
    let overduePoints = 0;
    if (isOverdue) {
      overduePoints = 15; // Impulso para garantizar Q1 (136+ pts)
    }

    rawScore = timePoints + durationBonus + priorityPoints + waitingFriction + statePoints + overduePoints;
    // Si la tarea inició, debe tener como mínimo 50 puntos de base
    rawScore = Math.max(50, rawScore);
  }

  const score = isDone
    ? 0
    : isNaN(rawScore)
    ? 40
    : Math.round(rawScore * 100) / 100;

  const quadrantNumber = isDone ? 9 : getQuadrantFromScore(score);

  // Categorize Urgency & Priority for backwards compatibility
  let urgencyCategory: 'high' | 'medium' | 'low' = 'low';
  if (quadrantNumber <= 3) {
    urgencyCategory = 'high';
  } else if (quadrantNumber <= 6) {
    urgencyCategory = 'medium';
  } else {
    urgencyCategory = 'low';
  }

  let priorityCategory: 'high' | 'medium' | 'low' = 'medium';
  if (pLevelNum >= 4) {
    priorityCategory = 'high';
  } else if (pLevelNum >= 2) {
    priorityCategory = 'medium';
  } else {
    priorityCategory = 'low';
  }

  return {
    percentElapsed,
    effectiveUrgency: score,
    urgencyCategory,
    priorityLevelNum: pLevelNum,
    priorityCategory,
    score,
    quadrantNumber,
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
  allPriorities?: CustomPriorityDefinition[],
  now: number = Date.now()
): TaskItem[] {
  const mapped = tasks.map((t) => ({
    task: t,
    info: calculateTaskUrgencyInfo(t, allPriorities, now),
  }));

  mapped.sort((a, b) => {
    // 1. Mayor puntuación primero (score de más a menos)
    if (b.info.score !== a.info.score) {
      return b.info.score - a.info.score;
    }
    // 2. Desempate: Fecha fin más cercana
    const endA = new Date(a.task.endDate).getTime();
    const endB = new Date(b.task.endDate).getTime();
    if (endA !== endB) return endA - endB;
    // 3. Desempate: Fecha inicio más cercana
    return new Date(a.task.startDate).getTime() - new Date(b.task.startDate).getTime();
  });

  return mapped.map((item) => item.task);
}
