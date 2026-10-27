import React from 'react';
import { TaskItem, CustomTag, Board, TaskStatus, CustomPriorityDefinition } from '../types';
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
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';

interface EisenhowerMatrixViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  allPriorities?: CustomPriorityDefinition[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTaskToQuadrant: (quadrant: number) => void;
  onReclassifyTask?: (taskId: string, targetCellId: string) => void;
  searchQuery?: string;
  filterPriority?: string;
  filterType?: string;
  filterTag?: string;
}

export interface Quadrant3x3Definition {
  id: string; // 'q1', 'q2', ...
  quadrantNumber: number; // 1 to 9
  scoreRange: string; // '273 - 306 pts', etc.
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

export const QUADRANTS_3X3: Quadrant3x3Definition[] = [
  // Fila 1: Crisis, Alta Urgencia y Recta Final (Zona de Ejecución Q1, Q2, Q3)
  {
    id: 'q1',
    quadrantNumber: 1,
    scoreRange: '136+ pts',
    pLevel: 'high',
    uLevel: 'high',
    rowTitle: 'Fila 1: Crisis & Alta Urgencia',
    colTitle: 'Columna 1: Urgencia Extrema',
    title: 'Q1: Entrega Límite & Vencidas',
    action: 'Atender Ahora Mismo',
    subtitle: 'Día límite de entrega (130 pts tiempo + prioridad) o vencidas',
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
    scoreRange: '116 - 135 pts',
    pLevel: 'high',
    uLevel: 'medium',
    rowTitle: 'Fila 1: Crisis & Alta Urgencia',
    colTitle: 'Columna 2: Inminencia',
    title: 'Q2: Al Límite / Alta Urgencia',
    action: 'Completar Hoy con Urgencia',
    subtitle: 'Tareas al 90%+ o con alta prioridad y bloqueos acumulados',
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
    scoreRange: '96 - 115 pts',
    pLevel: 'high',
    uLevel: 'low',
    rowTitle: 'Fila 1: Crisis & Alta Urgencia',
    colTitle: 'Columna 3: Recta Final',
    title: 'Q3: Entrando a Recta Final',
    action: 'Destrabar y Finalizar',
    subtitle: 'Tareas al 70% - 80% de avance o con revisiones acumuladas',
    icon: CalendarCheck,
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50/60',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
  },

  // Fila 2: Zona de Ejecución Activa (Q4, Q5, Q6)
  {
    id: 'q4',
    quadrantNumber: 4,
    scoreRange: '76 - 95 pts',
    pLevel: 'medium',
    uLevel: 'high',
    rowTitle: 'Fila 2: Zona de Ejecución',
    colTitle: 'Columna 1: Consumo Alto',
    title: 'Q4: Tareas Maduras & Micro-Tareas',
    action: 'Avanzar sin Demoras',
    subtitle: 'Avance avanzado del plazo o micro-tareas (< 24h con piso nominal)',
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
    scoreRange: '56 - 75 pts',
    pLevel: 'medium',
    uLevel: 'medium',
    rowTitle: 'Fila 2: Zona de Ejecución',
    colTitle: 'Columna 2: Núcleo Activo',
    title: 'Q5: Núcleo & Tareas Cortas',
    action: 'Mantener Ritmo Constante',
    subtitle: 'El núcleo de trabajo activo o tareas cortas (1 a 3 días de ventana)',
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
    scoreRange: '36 - 55 pts',
    pLevel: 'medium',
    uLevel: 'low',
    rowTitle: 'Fila 2: Zona de Ejecución',
    colTitle: 'Columna 3: Recién Iniciada',
    title: 'Q6: Transición & Flujo Inicial',
    action: 'Línea de Salida / Fluido',
    subtitle: 'Pre-embarque (91-100% listas para arrancar) y tareas recién iniciadas',
    icon: Users,
    accentColor: 'text-sky-600',
    borderColor: 'border-sky-300',
    bgLight: 'bg-sky-50/50',
    badgeBg: 'bg-sky-600',
    badgeText: 'text-white',
  },

  // Fila 3: Zona de Planificación (Antes de la fecha de inicio, 0 - 35 pts)
  {
    id: 'q7',
    quadrantNumber: 7,
    scoreRange: '26 - 35 pts',
    pLevel: 'low',
    uLevel: 'high',
    rowTitle: 'Fila 3: Zona de Planificación',
    colTitle: 'Columna 1: Arranque Inminente',
    title: 'Q7: Listas para Arrancar',
    action: 'Preparar para Iniciar Hoy',
    subtitle: 'Acumulan base de 30 pts de tiempo + prioridad',
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
    scoreRange: '16 - 25 pts',
    pLevel: 'low',
    uLevel: 'medium',
    rowTitle: 'Fila 3: Zona de Planificación',
    colTitle: 'Columna 2: En Cola',
    title: 'Q8: Acercándose al Inicio',
    action: 'Preparar Requisitos',
    subtitle: 'Tareas acercándose a su fecha de inicio programada',
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
    scoreRange: '0 - 15 pts',
    pLevel: 'low',
    uLevel: 'low',
    rowTitle: 'Fila 3: Zona de Planificación',
    colTitle: 'Columna 3: Planificación Inicial',
    title: 'Q9: Tareas Recién Creadas',
    action: 'Definir / Agendar',
    subtitle: 'Primer tercio de espera antes de la fecha de inicio',
    icon: Trash2,
    accentColor: 'text-slate-500',
    borderColor: 'border-slate-200',
    bgLight: 'bg-slate-50/40',
    badgeBg: 'bg-slate-400',
    badgeText: 'text-white',
  },
];

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
  allPriorities?: CustomPriorityDefinition[]
): RelativePriorityInfo {
  return calculateTaskUrgencyInfo(task, allPriorities);
}

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  tasks,
  allTags,
  allBoards,
  allPriorities,
  isMasterView,
  onSelectTask,
  onStatusChange,
  onAddTaskToQuadrant,
  onReclassifyTask,
  searchQuery = '',
  filterPriority = 'all',
  filterType = 'all',
  filterTag = 'all',
}) => {
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

  // Group tasks for 3x3 Grid by Quadrant (1 to 9) on the 306-point scale
  const getTasksForQuadrant = (quadrantNumber: number) => {
    const cellTasks = filteredTasks.filter((t) => {
      const info = getRelativePriorityInfo(t, allPriorities);
      return info.quadrantNumber === quadrantNumber;
    });
    return sortTasksByPriorityAndUrgency(cellTasks, allPriorities);
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
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Matriz de Priorización 3x3
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Escala ~170 pts: Planificación (Q9-Q7: 0 a 35 pts) · Ejecución (Q6-Q1: 36 a 136+ pts)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Motor de tiempo (130 pts) + Prioridad (0-20 pts) + Historial de fricción acumulativa (+5 pts/espera).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
          <span>Orden: Mayor Puntuación Primero</span>
        </div>
      </div>

      {/* 3x3 GRID CONTAINER */}
      <div>
        {/* 3x3 Grid Cells without column classification banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {QUADRANTS_3X3.map((q) => {
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

                  <button
                    type="button"
                    onClick={() => onAddTaskToQuadrant(q.quadrantNumber)}
                    className="p-1 hover:bg-white text-slate-500 hover:text-blue-600 rounded-lg transition-all cursor-pointer shadow-2xs border border-transparent hover:border-slate-200 shrink-0"
                    title={`Agregar tarea en ${q.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
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
