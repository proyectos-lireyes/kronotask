import React from 'react';
import { TaskItem, CustomTag, Board, TaskStatus, CustomPriorityDefinition, QuadrantConfig, DEFAULT_QUADRANT_CONFIG } from '../types';
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
      title: `Q1: Entrega < ${q1Days}d / Vencidas`,
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
      title: 'Q2: Termina Esta Semana',
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
      scoreRange: `${q2EndText} a ${config.q3DaysPostSunday || 15}d`,
      pLevel: 'high',
      uLevel: 'low',
      rowTitle: 'Fila 1: Crisis & Alta Urgencia',
      colTitle: 'Columna 3: Recta Final',
      title: `Q3: Termina en ${config.q3DaysPostSunday || 15}d`,
      action: 'Destrabar y Avanzar',
      subtitle: `Entre ${q2EndFullText} y ${config.q3DaysPostSunday || 15} días post-domingo`,
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
      scoreRange: `${config.q3DaysPostSunday || 15}d a ${config.q4DaysPostSunday || 30}d`,
      pLevel: 'medium',
      uLevel: 'high',
      rowTitle: 'Fila 2: Zona de Ejecución',
      colTitle: 'Columna 1: Consumo Alto',
      title: `Q4: Termina en ${config.q3DaysPostSunday || 15}d a ${config.q4DaysPostSunday || 30}d`,
      action: 'Avanzar sin Demoras',
      subtitle: `Entre ${config.q3DaysPostSunday || 15}d y ${config.q4DaysPostSunday || 30}d post-domingo`,
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
      scoreRange: `> ${config.q4DaysPostSunday || 30}d`,
      pLevel: 'medium',
      uLevel: 'medium',
      rowTitle: 'Fila 2: Zona de Ejecución',
      colTitle: 'Columna 2: Núcleo Activo',
      title: `Q5: Termina en +${config.q4DaysPostSunday || 30}d`,
      action: 'Mantener Ritmo Constante',
      subtitle: `Más de ${config.q4DaysPostSunday || 30} días post-domingo`,
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
      title: 'Q6: Inicia Esta Semana (Pre-Q2)',
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
      scoreRange: `${q6EndText} a ${config.q7DaysPostSunday || 15}d`,
      pLevel: 'low',
      uLevel: 'high',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 1: Arranque Inminente',
      title: `Q7: Inicia en ${config.q7DaysPostSunday || 15}d`,
      action: 'Preparar para Iniciar',
      subtitle: `Inicia entre ${q6EndFullText} y ${config.q7DaysPostSunday || 15} días post-domingo`,
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
      scoreRange: `${config.q7DaysPostSunday || 15}d a ${config.q8DaysPostSunday || 30}d`,
      pLevel: 'low',
      uLevel: 'medium',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 2: En Cola',
      title: `Q8: Inicia en ${config.q7DaysPostSunday || 15}d a ${config.q8DaysPostSunday || 30}d`,
      action: 'Revisar Requisitos',
      subtitle: `Inicia entre ${config.q7DaysPostSunday || 15}d y ${config.q8DaysPostSunday || 30}d post-domingo`,
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
      scoreRange: `> ${config.q8DaysPostSunday || 30}d`,
      pLevel: 'low',
      uLevel: 'low',
      rowTitle: 'Fila 3: Zona de Planificación',
      colTitle: 'Columna 3: Planificación Inicial',
      title: `Q9: Inicia en +${config.q8DaysPostSunday || 30}d`,
      action: 'Agendar / Definir',
      subtitle: `Inicia a más de ${config.q8DaysPostSunday || 30} días post-domingo`,
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
      {/* Configuration Header Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">
            Reglas de Tiempo Matriz: <span className="font-extrabold text-blue-700">Q1 &lt; {quadrantConfig.q1Days}d</span> ·{' '}
            <span className="font-extrabold text-amber-700">Q2 {quadrantConfig.q2UseNextSunday ? 'Sig. Domingo' : `< ${quadrantConfig.q2CustomDays}d`}</span>
          </span>
        </div>
        {onOpenQuadrantSettings && (
          <button
            type="button"
            onClick={onOpenQuadrantSettings}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            title="Personalizar rangos de tiempo de cada cuadrante (Q1 a Q9)"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Ajustar Rangos de Q1-Q9</span>
          </button>
        )}
      </div>

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
                className={`rounded-2xl border-2 ${q.borderColor} ${q.bgLight} p-3 flex flex-col min-h-[320px] transition-all shadow-xs`}
              >
                {/* Cell Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl bg-white shadow-2xs ${q.accentColor}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${q.badgeBg} ${q.badgeText} shadow-2xs`}>
                          Q{q.quadrantNumber}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">{q.title}</h3>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${q.badgeBg} ${q.badgeText} shadow-2xs`}
                        >
                          {cellTasks.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/90 text-slate-700 border border-slate-200/80">
                          {q.scoreRange}
                        </span>
                        <p className={`text-[10px] font-bold ${q.accentColor}`}>{q.action}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onOpenQuadrantSettings && (
                      <button
                        type="button"
                        onClick={onOpenQuadrantSettings}
                        className="p-1 hover:bg-white text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer shadow-2xs border border-transparent hover:border-slate-200 shrink-0"
                        title={`Ajustar rango de tiempo de Q${q.quadrantNumber}`}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddTaskToQuadrant(q.quadrantNumber)}
                      className="p-1 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-all cursor-pointer shadow-2xs border border-transparent hover:border-slate-200 shrink-0"
                      title={`Agregar tarea en ${q.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-0.5">
                  {cellTasks.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center p-3 border-2 border-dashed border-slate-200/80 rounded-xl bg-white/40 text-slate-400">
                      <IconComp className="w-6 h-6 mb-1 opacity-30 text-slate-400" />
                      <p className="text-[11px] font-bold text-slate-500">Sin tareas aquí</p>
                    </div>
                  ) : (
                    cellTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        allTags={allTags}
                        board={allBoards?.find((b) => b.id === task.boardId)}
                        isMasterView={isMasterView}
                        onSelect={onSelectTask}
                        onStatusChange={onStatusChange}
                        onDragStart={handleDragStart}
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
