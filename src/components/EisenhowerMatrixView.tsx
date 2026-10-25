import React from 'react';
import { TaskItem, CustomTag, Board, TaskStatus, CustomPriorityDefinition } from '../types';
import { TaskCard } from './TaskCard';
import { calculateTimeLevel } from '../utils/timeColor';
import { getTaskPriorityScore, sortTasksByPriorityAndUrgency } from '../utils/prioritySort';
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
  onAddTaskToQuadrant: (quadrant: 1 | 2 | 3 | 4) => void;
  onReclassifyTask?: (taskId: string, targetCellId: string) => void;
  searchQuery?: string;
  filterPriority?: string;
  filterType?: string;
  filterTag?: string;
}

export interface Quadrant3x3Definition {
  id: string; // 'high_high', 'high_med', 'high_low', etc.
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
  // Row 1: Prioridad Alta / Crítica
  {
    id: 'high_high',
    pLevel: 'high',
    uLevel: 'high',
    rowTitle: 'Prioridad Alta / Crítica',
    colTitle: 'Alta Urgencia (≥75% transcurrido)',
    title: '1. Crisis & Acción Inmediata',
    action: 'Atender Ahora Mismo',
    subtitle: 'Alta prioridad con ≥ 75% del tiempo transcurrido o vencida',
    icon: Flame,
    accentColor: 'text-rose-600',
    borderColor: 'border-rose-400',
    bgLight: 'bg-rose-50/70',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
  },
  {
    id: 'high_med',
    pLevel: 'high',
    uLevel: 'medium',
    rowTitle: 'Prioridad Alta / Crítica',
    colTitle: 'Media Urgencia (50%-74% transcurrido)',
    title: '2. En Ejecución Prioritaria',
    action: 'Avanzar y Completar Hoy',
    subtitle: 'Alta prioridad con 50%-74% del tiempo transcurrido',
    icon: Zap,
    accentColor: 'text-amber-600',
    borderColor: 'border-amber-400',
    bgLight: 'bg-amber-50/70',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
  },
  {
    id: 'high_low',
    pLevel: 'high',
    uLevel: 'low',
    rowTitle: 'Prioridad Alta / Crítica',
    colTitle: 'Baja Urgencia (<50% transcurrido)',
    title: '3. Planificación Estratégica',
    action: 'Programar Bloques de Trabajo',
    subtitle: 'Alta prioridad con plazo holgado (< 50% transcurrido)',
    icon: CalendarCheck,
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50/60',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
  },

  // Row 2: Prioridad Media
  {
    id: 'med_high',
    pLevel: 'medium',
    uLevel: 'high',
    rowTitle: 'Prioridad Media',
    colTitle: 'Alta Urgencia (≥75% transcurrido)',
    title: '4. Atender con Agilidad',
    action: 'Resolver o Delegar Rápidamente',
    subtitle: 'Prioridad media pero con ≥ 75% del tiempo consumido',
    icon: Clock,
    accentColor: 'text-orange-600',
    borderColor: 'border-orange-300',
    bgLight: 'bg-orange-50/60',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
  },
  {
    id: 'med_med',
    pLevel: 'medium',
    uLevel: 'medium',
    rowTitle: 'Prioridad Media',
    colTitle: 'Media Urgencia (50%-74% transcurrido)',
    title: '5. Progreso Regular',
    action: 'Mantener Ritmo de Avance',
    subtitle: 'Prioridad media a mitad de su ciclo de vida (50%-74%)',
    icon: ArrowRight,
    accentColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    bgLight: 'bg-yellow-50/60',
    badgeBg: 'bg-yellow-500',
    badgeText: 'text-white',
  },
  {
    id: 'med_low',
    pLevel: 'medium',
    uLevel: 'low',
    rowTitle: 'Prioridad Media',
    colTitle: 'Baja Urgencia (<50% transcurrido)',
    title: '6. En Reserva de Tiempo',
    action: 'Organizar / Fecha Futura',
    subtitle: 'Prioridad media con tiempo holgado (< 50% transcurrido)',
    icon: Users,
    accentColor: 'text-sky-600',
    borderColor: 'border-sky-300',
    bgLight: 'bg-sky-50/50',
    badgeBg: 'bg-sky-600',
    badgeText: 'text-white',
  },

  // Row 3: Prioridad Baja
  {
    id: 'low_high',
    pLevel: 'low',
    uLevel: 'high',
    rowTitle: 'Prioridad Baja',
    colTitle: 'Alta Urgencia (≥75% transcurrido)',
    title: '7. Última Llamada',
    action: 'Atender si Queda Tiempo Libre',
    subtitle: 'Baja prioridad con ≥ 75% del tiempo consumido',
    icon: AlertTriangle,
    accentColor: 'text-stone-700',
    borderColor: 'border-stone-300',
    bgLight: 'bg-stone-100/60',
    badgeBg: 'bg-stone-700',
    badgeText: 'text-white',
  },
  {
    id: 'low_med',
    pLevel: 'low',
    uLevel: 'medium',
    rowTitle: 'Prioridad Baja',
    colTitle: 'Media Urgencia (50%-74% transcurrido)',
    title: '8. Postergar / Monitorear',
    action: 'Revisar en Próximo Ciclo',
    subtitle: 'Baja prioridad a mitad de su plazo (50%-74%)',
    icon: Archive,
    accentColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50/70',
    badgeBg: 'bg-slate-600',
    badgeText: 'text-white',
  },
  {
    id: 'low_low',
    pLevel: 'low',
    uLevel: 'low',
    rowTitle: 'Prioridad Baja',
    colTitle: 'Baja Urgencia (<50% transcurrido)',
    title: '9. Secundario / Prescindible',
    action: 'Descartar o Archivar',
    subtitle: 'Baja prioridad con tiempo holgado (< 50% transcurrido)',
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
}

export function getRelativePriorityInfo(
  task: TaskItem,
  allPriorities?: CustomPriorityDefinition[]
): RelativePriorityInfo {
  const isDone = task.status === 'done';
  const now = Date.now();
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);

  let percentElapsed = timeCalc.percentElapsed;
  if (timeCalc.isOverdue && !isDone) {
    percentElapsed = 100;
  }

  // Start date imminence weight
  let startBonus = 0;
  if (!isDone) {
    const startMs = new Date(task.startDate).getTime();
    if (now >= startMs) {
      startBonus = 15;
    } else {
      const diffHours = (startMs - now) / (1000 * 3600);
      if (diffHours <= 12) startBonus = 10;
      else if (diffHours <= 24) startBonus = 5;
    }
  }

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

  const effectiveUrgency = percentElapsed + startBonus;
  let urgencyCategory: 'high' | 'medium' | 'low' = 'low';
  if (effectiveUrgency >= 75 || timeCalc.isOverdue) urgencyCategory = 'high';
  else if (effectiveUrgency >= 50) urgencyCategory = 'medium';
  else urgencyCategory = 'low';

  const score = pLevelNum * 20 + effectiveUrgency;

  return {
    percentElapsed,
    priorityLevelNum: pLevelNum,
    priorityCategory,
    urgencyCategory,
    score,
  };
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
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterTag !== 'all' && !t.tags.includes(filterTag)) return false;

    return true;
  });

  // Group tasks for 3x3 Grid
  const getTasksFor3x3Cell = (pLevel: 'high' | 'medium' | 'low', uLevel: 'high' | 'medium' | 'low') => {
    const cellTasks = filteredTasks.filter((t) => {
      const info = getRelativePriorityInfo(t, allPriorities);
      return info.priorityCategory === pLevel && info.urgencyCategory === uLevel;
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
                Prioridad, Urgencia e Importancia
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
          <span>Orden: Mayor Prioridad Relativa Primero</span>
        </div>
      </div>

      {/* 3x3 GRID CONTAINER */}
      <div className="space-y-4">
        {/* Column Legend Headers for 3x3 */}
        <div className="hidden md:grid grid-cols-3 gap-3 text-center text-xs font-extrabold uppercase">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Alta Urgencia (≥ 75% Consumido)</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Media Urgencia (50% - 74% Consumido)</span>
          </div>
          <div className="p-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Baja Urgencia (&lt; 50% Consumido)</span>
          </div>
        </div>

        {/* 3x3 Grid Cells */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {QUADRANTS_3X3.map((q) => {
            const cellTasks = getTasksFor3x3Cell(q.pLevel, q.uLevel);
            const IconComp = q.icon;

            return (
              <div
                key={q.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOn3x3Cell(e, q.id)}
                className={`rounded-2xl border-2 ${q.borderColor} ${q.bgLight} p-3 flex flex-col min-h-[320px] transition-all shadow-xs`}
              >
                {/* Cell Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5 pb-2.5 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl bg-white shadow-2xs ${q.accentColor}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">{q.title}</h3>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${q.badgeBg} ${q.badgeText} shadow-2xs`}
                        >
                          {cellTasks.length}
                        </span>
                      </div>
                      <p className={`text-[10px] font-bold ${q.accentColor}`}>{q.action}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddTaskToQuadrant(1)}
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
