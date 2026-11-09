import React from 'react';
import { TaskItem, CustomTag, Board, TaskStatus, CustomPriorityDefinition, QuadrantConfig, DEFAULT_QUADRANT_CONFIG, BackgroundTone } from '../types';
import { TaskCard } from './TaskCard';
import { calculateTimeLevel } from '../utils/timeColor';
import { getTaskPriorityScore, sortTasksByPriorityAndUrgency, calculateTaskUrgencyInfo } from '../utils/prioritySort';
import {
  Flame,
  Zap,
  CalendarCheck,
  Clock,
  ArrowRight,
  Users,
  AlertTriangle,
  Archive,
  Trash2,
  Plus,
  Settings2,
} from 'lucide-react';

interface EisenhowerMatrixViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  allPriorities?: CustomPriorityDefinition[];
  quadrantConfig?: QuadrantConfig;
  bgTone?: BackgroundTone;
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTaskToQuadrant: (quadrant: number) => void;
  onReclassifyTask?: (taskId: string, targetCellId: string) => void;
  onOpenQuadrantSettings?: () => void;
  searchQuery?: string;
  filterPriority?: string;
  filterType?: string;
  filterTag?: string;
}

export interface Quadrant3x3Definition {
  id: string; // 'q1', 'q2', ...
  quadrantNumber: number; // 1 to 9
  scoreRange: string;
  pLevel: 'high' | 'medium' | 'low';
  uLevel: 'high' | 'medium' | 'low';
  rowTitle: string;
  colTitle: string;
  title: string;
  action: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderColor: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
}

export function getQuadrants3x3(config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG): Quadrant3x3Definition[] {
  const q1Days = config.q1Days || 4;
  const q2EndText = config.q2UseNextSunday ? 'Sig. Domingo' : `${config.q2CustomDays || 7}d`;
  const q2EndFullText = config.q2UseNextSunday
    ? 'el Siguiente Domingo'
    : `${config.q2CustomDays || 7} días`;

  const q6EndText = config.q6UseNextSunday ? 'Sig. Domingo' : `${config.q6CustomDays || 7}d`;
  const q6EndFullText = config.q6UseNextSunday
    ? 'el Siguiente Domingo'
    : `${config.q6CustomDays || 7} días`;

  const q3End = config.q3DaysPostSunday || 15;
  const q4End = config.q4DaysPostSunday || 30;
  const q7End = config.q7DaysPostSunday || 15;
  const q8End = config.q8DaysPostSunday || 30;

  // Suffixes based on Sunday vs Fixed Days mode
  const q3Suffix = config.q2UseNextSunday ? ' post-Dom' : '';
  const q6Suffix = config.q6UseNextSunday ? ' post-Dom' : '';

  return [
    // Fila 1: Urgencia Extrema & Corto Plazo (Q1, Q2, Q3)
    {
      id: 'q1',
      quadrantNumber: 1,
      scoreRange: `< ${q1Days}d / Vencidas`,
      pLevel: 'high',
      uLevel: 'high',
      rowTitle: 'Fila 1: Crisis & Alta Urgencia',
      colTitle: 'Columna 1: Urgencia Extrema',
      title: `Q1: Vencidas y < ${q1Days}d`,
      action: 'Atender Ahora Mismo',
      subtitle: `Vencidas o menos de ${q1Days} días para la entrega`,
      icon: Flame,
      accentColor: 'text-rose-600',
      borderColor: 'border-rose-400',
      bgLight: 'bg-rose-50/70',
      badgeBg: 'bg-rose-600',
      badgeText: 'text-white',
    },
    {
      id: 'q2',
      quadrantNumber: 2,
      scoreRange: `${q1Days}d a ${q2EndText}`,
      pLevel: 'high',
      uLevel: 'medium',
      rowTitle: 'Fila 1: Crisis & Alta Urgencia',
      colTitle: 'Columna 2: Inminencia',
      title: `Q2: Desde ${q1Days}d hasta ${q2EndText}`,
      action: 'Completar Esta Semana',
      subtitle: `Entre ${q1Days} días y ${q2EndFullText}`,
      icon: Zap,
      accentColor: 'text-amber-600',
      borderColor: 'border-amber-400',
      bgLight: 'bg-amber-50/70',
      badgeBg: 'bg-amber-600',
      badgeText: 'text-white',
    },
    {
      id: 'q3',
      quadrantNumber: 3,
      scoreRange: `${q2EndText} a ${q3End}d`,
      pLevel: 'high',
      uLevel: 'low',
      rowTitle: 'Fila 1: Crisis & Alta Urgencia',
      colTitle: 'Columna 3: Recta Final',
      title: `Q3: Desde ${q2EndText} hasta ${q3End}d${q3Suffix}`,
      action: 'Destrabar y Avanzar',
      subtitle: `Entre ${q2EndFullText} y ${q3End} días${q3Suffix}`,
      icon: CalendarCheck,
      accentColor: 'text-blue-600',
      borderColor: 'border-blue-300',
      bgLight: 'bg-blue-50/60',
      badgeBg: 'bg-blue-600',
      badgeText: 'text-white',
    },

    // Fila 2: Zona de Ejecución Regular & Holgada (Q4, Q5, Q6)
    {
      id: 'q4',
      quadrantNumber: 4,
      scoreRange: `${q3End}d a ${q4End}d`,
      pLevel: 'medium',
      uLevel: 'high',
      rowTitle: 'Fila 2: Zona de Ejecución',
      colTitle: 'Columna 1: Consumo Alto',
      title: `Q4: Desde ${q3End}d hasta ${q4End}d${q3Suffix}`,
      action: 'Avanzar sin Demoras',
      subtitle: `Entre ${q3End}d y ${q4End}d${q3Suffix}`,
      icon: Clock,
      accentColor: 'text-orange-600',
      borderColor: 'border-orange-300',
      bgLight: 'bg-orange-50/60',
      badgeBg: 'bg-orange-500',
      badgeText: 'text-white',
    },
    {
      id: 'q5',
      quadrantNumber: 5,
      scoreRange: `> ${q4End}d`,
      pLevel: 'medium',
      uLevel: 'medium',
      rowTitle: 'Fila 2: Zona de Ejecución',
      colTitle: 'Columna 2: Núcleo Activo',
      title: `Q5: Más de ${q4End}d${q3Suffix}`,
      action: 'Mantener Ritmo Constante',
      subtitle: `Más de ${q4End} días${q3Suffix}`,
      icon: ArrowRight,
      accentColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      bgLight: 'bg-yellow-50/60',
      badgeBg: 'bg-yellow-500',
      badgeText: 'text-white',
    },
    {
      id: 'q6',
      quadrantNumber: 6,
      scoreRange: `< ${q6EndText}`,
      pLevel: 'medium',
      uLevel: 'low',
      rowTitle: 'Fila 2: Zona de Ejecución',
      colTitle: 'Columna 3: Recién Iniciada',
      title: `Q6: Inicia antes de ${q6EndText}`,
      action: 'Puerta de Entrada',
      subtitle: `Inicia antes de ${q6EndFullText}`,
      icon: Users,
      accentColor: 'text-sky-600',
      borderColor: 'border-sky-300',
      bgLight: 'bg-sky-50/50',
      badgeBg: 'bg-sky-600',
      badgeText: 'text-white',
    },

    // Fila 3: Zona de Planificación (Antes de la fecha de inicio: Q7, Q8, Q9)
    {
      id: 'q7',
      quadrantNumber: 7,
      scoreRange: `${q6EndText} a ${q7End}d`,
      pLevel: 'low',
      uLevel: 'high',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 1: Arranque Inminente',
      title: `Q7: Desde ${q6EndText} hasta ${q7End}d${q6Suffix}`,
      action: 'Preparar para Iniciar',
      subtitle: `Inicia entre ${q6EndFullText} y ${q7End} días${q6Suffix}`,
      icon: AlertTriangle,
      accentColor: 'text-stone-700',
      borderColor: 'border-stone-300',
      bgLight: 'bg-stone-100/60',
      badgeBg: 'bg-stone-700',
      badgeText: 'text-white',
    },
    {
      id: 'q8',
      quadrantNumber: 8,
      scoreRange: `${q7End}d a ${q8End}d`,
      pLevel: 'low',
      uLevel: 'medium',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 2: En Cola',
      title: `Q8: Desde ${q7End}d hasta ${q8End}d${q6Suffix}`,
      action: 'Revisar Requisitos',
      subtitle: `Inicia entre ${q7End}d y ${q8End}d${q6Suffix}`,
      icon: Archive,
      accentColor: 'text-slate-600',
      borderColor: 'border-slate-300',
      bgLight: 'bg-slate-50/70',
      badgeBg: 'bg-slate-600',
      badgeText: 'text-white',
    },
    {
      id: 'q9',
      quadrantNumber: 9,
      scoreRange: `> ${q8End}d`,
      pLevel: 'low',
      uLevel: 'low',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 3: Planificación Inicial',
      title: `Q9: Más de ${q8End}d${q6Suffix}`,
      action: 'Agendar / Definir',
      subtitle: `Inicia a más de ${q8End} días${q6Suffix}`,
      icon: Trash2,
      accentColor: 'text-slate-500',
      borderColor: 'border-slate-200',
      bgLight: 'bg-slate-50/40',
      badgeBg: 'bg-slate-400',
      badgeText: 'text-white',
    },
  ];
}

export interface RelativePriorityInfo {
  percentElapsed: number;
  priorityLevelNum: number;
  priorityCategory: 'high' | 'medium' | 'low';
  urgencyCategory: 'high' | 'medium' | 'low';
  score: number;
  quadrantNumber: number;
}

export function getRelativePriorityInfo(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[],
  config: QuadrantConfig = DEFAULT_QUADRANT_CONFIG
): RelativePriorityInfo {
  return calculateTaskUrgencyInfo(task, allPriorities, Date.now(), config);
}

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  tasks,
  allTags,
  allBoards,
  allPriorities,
  quadrantConfig = DEFAULT_QUADRANT_CONFIG,
  bgTone = 'cream',
  isMasterView,
  onSelectTask,
  onStatusChange,
  onAddTaskToQuadrant,
  onReclassifyTask,
  onOpenQuadrantSettings,
  searchQuery = '',
  filterPriority = 'all',
  filterType = 'all',
  filterTag = 'all',
}) => {
  const quadrants = getQuadrants3x3(quadrantConfig);

  const quadrantBgClass =
    bgTone === 'cream'
      ? 'bg-[#ede8db] dark:bg-slate-900'
      : bgTone === 'gray'
      ? 'bg-[#e7ecf2] dark:bg-slate-900'
      : 'bg-white dark:bg-slate-900';

  const iconBgClass =
    bgTone === 'cream'
      ? 'bg-[#e2dcce]'
      : bgTone === 'gray'
      ? 'bg-[#dbe1e9]'
      : 'bg-white';

  const emptyPlaceholderClass =
    bgTone === 'cream'
      ? 'border-[#ded8c8] bg-[#e2dcce]/40 text-amber-950/40'
      : bgTone === 'gray'
      ? 'border-[#d0d6df] bg-[#dbe1e9]/40 text-slate-500'
      : 'border-slate-200/80 bg-white/40 text-slate-400';

  // Filter active tasks
  const filteredTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(t.tags) && t.tags.some((tag) => (tag || '').toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterTag !== 'all' && (!Array.isArray(t.tags) || !t.tags.includes(filterTag))) return false;

    return true;
  });

  // Group tasks for 3x3 Grid by Quadrant (1 to 9) using quadrantConfig
  const getTasksForQuadrant = (quadrantNumber: number) => {
    const cellTasks = filteredTasks.filter((t) => {
      const info = getRelativePriorityInfo(t, allPriorities, quadrantConfig);
      return info.quadrantNumber === quadrantNumber;
    });
    return sortTasksByPriorityAndUrgency(cellTasks, allPriorities, Date.now(), quadrantConfig);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDropOn3x3Cell = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onReclassifyTask) {
      onReclassifyTask(taskId, cellId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-3">
      {/* 3x3 GRID CONTAINER */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {quadrants.map((q) => {
            const cellTasks = getTasksForQuadrant(q.quadrantNumber);
            const IconComp = q.icon;

            return (
              <div
                key={q.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOn3x3Cell(e, q.id)}
                className={`rounded-2xl border-2 ${q.borderColor} ${quadrantBgClass} p-2 sm:p-2.5 flex flex-col min-h-[60px] max-w-full resize-y overflow-auto transition-all shadow-2xs relative group`}
              >
                {/* Cell Header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-xl ${iconBgClass} shadow-2xs shrink-0 ${q.accentColor}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {q.title}
                      </h3>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${q.badgeBg} ${q.badgeText} shadow-2xs shrink-0`}>
                        {cellTasks.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
                  {cellTasks.length === 0 ? (
                    <div className={`h-32 flex flex-col items-center justify-center text-center p-3 border-2 border-dashed rounded-xl ${emptyPlaceholderClass}`}>
                      <IconComp className="w-6 h-6 mb-1 opacity-30 text-slate-400" />
                      <p className="text-[11px] font-bold text-slate-500">Sin tareas aquí</p>
                    </div>
                  ) : (
                    cellTasks.map((task, idx) => (
                      <TaskCard
                        key={`${task.id}-${idx}`}
                        task={task}
                        allTags={allTags}
                        board={allBoards?.find((b) => b.id === task.boardId)}
                        isMasterView={isMasterView}
                        onSelect={onSelectTask}
                        onStatusChange={onStatusChange}
                        onDragStart={handleDragStart}
                        bgTone={bgTone}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
