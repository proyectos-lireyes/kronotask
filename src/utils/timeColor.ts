import { TimeColorLevel } from '../types';

export interface TimeCalculation {
  level: TimeColorLevel;
  percentElapsed: number; // 0 to 100+
  percentRemaining: number;
  isOverdue: boolean;
  notStarted: boolean;
  remainingMs: number;
  remainingText: string;
  totalDurationMs: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  progressColor: string;
  cardAccentBg: string;
  cardRing: string;
}

export function formatDuration(ms: number): string {
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const days = Math.floor(totalSeconds / 86400);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.slice(0, 2).join(' ') || '< 1m';
}

export function calculateTimeLevel(
  startDateStr: string,
  endDateStr: string,
  now: number = Date.now(),
  isCompleted: boolean = false
): TimeCalculation {
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  const totalDurationMs = Math.max(60000, end - start); // At least 1 minute

  const remainingMs = end - now;
  const isOverdue = remainingMs < 0;
  const notStarted = now < start;

  let percentElapsed = 0;
  if (isCompleted) {
    percentElapsed = 0;
  } else if (isOverdue) {
    const overdueRatio = Math.abs(remainingMs) / totalDurationMs;
    percentElapsed = 100 + Math.min(100, Math.floor(overdueRatio * 100));
  } else if (notStarted) {
    // Current time is before start date.
    // Evaluate progress towards start date relative to total task duration.
    const startRemMs = start - now;
    if (startRemMs <= totalDurationMs) {
      // Within 1 duration window of starting: ratio scales smoothly up to 24.9%
      const startProximityRatio = Math.max(0, 1 - startRemMs / totalDurationMs);
      percentElapsed = Math.min(24.9, Math.floor(startProximityRatio * 24.9));
    } else {
      percentElapsed = 0;
    }
  } else {
    // Current time is between startDate and endDate
    const rawRatio = (now - start) / totalDurationMs;
    percentElapsed = Math.min(99.9, Math.max(0, rawRatio * 100));
  }

  const percentRemaining = Math.max(0, 100 - percentElapsed);

  let remainingText = '';
  if (isCompleted) {
    remainingText = 'Completada';
  } else if (isOverdue) {
    remainingText = `Vencida hace ${formatDuration(remainingMs)}`;
  } else if (notStarted) {
    remainingText = `Inicia en ${formatDuration(start - now)}`;
  } else {
    remainingText = `Quedan ${formatDuration(remainingMs)}`;
  }

  // Determine 5 levels of color from green to red, plus black when overdue
  let level: TimeColorLevel = 'green';
  let label = 'Holgado (< 25%)';
  let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let badgeText = 'text-emerald-700';
  let borderColor = 'border-emerald-500';
  let progressColor = 'bg-emerald-500';
  let cardAccentBg = 'bg-emerald-50/50';
  let cardRing = 'focus-within:ring-emerald-400';

  if (isOverdue && !isCompleted) {
    level = 'black';
    label = 'Superó Fecha Límite';
    badgeBg = 'bg-stone-900 text-amber-200 border-stone-800';
    badgeText = 'text-stone-900';
    borderColor = 'border-stone-900';
    progressColor = 'bg-stone-900';
    cardAccentBg = 'bg-stone-100/90';
    cardRing = 'focus-within:ring-stone-900';
  } else if (percentElapsed >= 90) {
    level = 'red';
    label = 'Crítico (90% - 100%)';
    badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
    badgeText = 'text-rose-700';
    borderColor = 'border-rose-500';
    progressColor = 'bg-rose-500';
    cardAccentBg = 'bg-rose-50/60';
    cardRing = 'focus-within:ring-rose-400';
  } else if (percentElapsed >= 75) {
    level = 'orange';
    label = 'Atención (75% - 89%)';
    badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
    badgeText = 'text-amber-800';
    borderColor = 'border-amber-500';
    progressColor = 'bg-amber-500';
    cardAccentBg = 'bg-amber-50/50';
    cardRing = 'focus-within:ring-amber-400';
  } else if (percentElapsed >= 50) {
    level = 'yellow';
    label = 'Medio (50% - 74%)';
    badgeBg = 'bg-yellow-100 text-yellow-900 border-yellow-300';
    badgeText = 'text-yellow-800';
    borderColor = 'border-yellow-500';
    progressColor = 'bg-yellow-500';
    cardAccentBg = 'bg-yellow-50/40';
    cardRing = 'focus-within:ring-yellow-400';
  } else if (percentElapsed >= 25) {
    level = 'blue';
    label = 'En curso (25% - 49%)';
    badgeBg = 'bg-sky-100 text-sky-800 border-sky-300';
    badgeText = 'text-sky-700';
    borderColor = 'border-sky-500';
    progressColor = 'bg-sky-500';
    cardAccentBg = 'bg-sky-50/50';
    cardRing = 'focus-within:ring-sky-400';
  } else {
    level = 'green';
    label = 'Holgado (0% - 24%)';
    badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    badgeText = 'text-emerald-700';
    borderColor = 'border-emerald-500';
    progressColor = 'bg-emerald-500';
    cardAccentBg = 'bg-emerald-50/40';
    cardRing = 'focus-within:ring-emerald-400';
  }

  return {
    level,
    percentElapsed,
    percentRemaining,
    isOverdue,
    notStarted,
    remainingMs,
    remainingText,
    totalDurationMs,
    label,
    badgeBg,
    badgeText,
    borderColor,
    progressColor,
    cardAccentBg,
    cardRing,
  };
}

export const TIME_COLOR_LEGEND: {
  level: TimeColorLevel;
  title: string;
  description: string;
  range: string;
  colorHex: string;
  badgeBg: string;
}[] = [
  {
    level: 'green',
    title: 'Nivel 1 - Verde',
    description: 'Tiempo inicial / Holgado',
    range: '0% a 24% del tiempo transcurrido',
    colorHex: '#10b981',
    badgeBg: 'bg-emerald-500 text-white',
  },
  {
    level: 'blue',
    title: 'Nivel 2 - Azul',
    description: 'Progreso regular',
    range: '25% a 49% del tiempo transcurrido',
    colorHex: '#0ea5e9',
    badgeBg: 'bg-sky-500 text-white',
  },
  {
    level: 'yellow',
    title: 'Nivel 3 - Amarillo',
    description: 'Mitad de plazo transcurrido',
    range: '50% a 74% del tiempo transcurrido',
    colorHex: '#eab308',
    badgeBg: 'bg-yellow-500 text-white',
  },
  {
    level: 'orange',
    title: 'Nivel 4 - Naranja',
    description: 'Atención requerida',
    range: '75% a 89% del tiempo transcurrido',
    colorHex: '#f97316',
    badgeBg: 'bg-orange-500 text-white',
  },
  {
    level: 'red',
    title: 'Nivel 5 - Rojo',
    description: 'Fase crítica / Próximo a vencer',
    range: '90% a 99% del tiempo transcurrido',
    colorHex: '#ef4444',
    badgeBg: 'bg-rose-500 text-white',
  },
  {
    level: 'black',
    title: 'Nivel 6 - Negro (Alerta Máxima)',
    description: 'Fecha límite superada (Vencida)',
    range: 'Automático al superar 100% del plazo',
    colorHex: '#1c1917',
    badgeBg: 'bg-stone-900 text-amber-200',
  },
];
