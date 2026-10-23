import React from 'react';
import { TaskItem, CustomTag, Board, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { calculateTimeLevel } from '../utils/timeColor';
import {
  Flame,
  CalendarCheck,
  Users,
  Archive,
  Plus,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';

interface EisenhowerMatrixViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTaskToQuadrant: (quadrant: 1 | 2 | 3 | 4) => void;
  onReclassifyTask?: (taskId: string, quadrant: 1 | 2 | 3 | 4) => void;
  searchQuery?: string;
  filterPriority?: string;
  filterType?: string;
  filterTag?: string;
}

export interface QuadrantDefinition {
  id: 1 | 2 | 3 | 4;
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

export const QUADRANTS: QuadrantDefinition[] = [
  {
    id: 1,
    title: 'Cuadrante I: Urgente e Importante',
    action: 'Hacer Primero (Crisis / Hoy)',
    subtitle: 'Vence en < 48h o semáforo rojo/naranja con alta prioridad',
    icon: Flame,
    accentColor: 'text-rose-600',
    borderColor: 'border-rose-300',
    bgLight: 'bg-rose-50/40',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
  },
  {
    id: 2,
    title: 'Cuadrante II: No Urgente pero Importante',
    action: 'Planificar (Estratégico)',
    subtitle: 'Alta prioridad con plazo holgado para planificar y avanzar',
    icon: CalendarCheck,
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50/40',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
  },
  {
    id: 3,
    title: 'Cuadrante III: Urgente pero No Importante',
    action: 'Delegar / Agilizar',
    subtitle: 'Vence pronto pero con menor prioridad o impacto estratégico',
    icon: Users,
    accentColor: 'text-amber-600',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50/40',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
  },
  {
    id: 4,
    title: 'Cuadrante IV: No Urgente y No Importante',
    action: 'Postergar / Eliminar',
    subtitle: 'Baja prioridad y tiempo holgado; prescindible o secundario',
    icon: Archive,
    accentColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50/60',
    badgeBg: 'bg-slate-500',
    badgeText: 'text-white',
  },
];

/**
 * Determines whether a task is classified as Important and Urgent
 */
export function classifyEisenhowerTask(task: TaskItem): 1 | 2 | 3 | 4 {
  const isDone = task.status === 'done';
  const now = Date.now();
  const end = new Date(task.endDate).getTime();
  const remainingHours = (end - now) / (1000 * 60 * 60);

  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);

  // Criteria for Important: High priority, Critical, Urgent, or explicit high flag
  const isImportant =
    task.priority === 'high' ||
    task.priority === 'urgent' ||
    task.priority === 'critical' ||
    task.priority === 'alta';

  // Criteria for Urgent: Remaining time < 48 hours OR Semáforo Red/Orange/Black (overdue)
  const isUrgent =
    remainingHours <= 48 ||
    timeCalc.level === 'red' ||
    timeCalc.level === 'orange' ||
    timeCalc.level === 'black';

  if (isImportant && isUrgent) return 1;
  if (isImportant && !isUrgent) return 2;
  if (!isImportant && isUrgent) return 3;
  return 4;
}

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  tasks,
  allTags,
  allBoards,
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

    // Search query filter
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

  // Group tasks by quadrant AND sort strictly by closest end date (fecha de fin más cercana)
  const getQuadrantTasks = (qId: 1 | 2 | 3 | 4) => {
    return filteredTasks
      .filter((t) => classifyEisenhowerTask(t) === qId)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDropOnQuadrant = (e: React.DragEvent, targetQuadrant: 1 | 2 | 3 | 4) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onReclassifyTask) {
      onReclassifyTask(taskId, targetQuadrant);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner explaining Eisenhower Logic & Closest Deadline Sort */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              Matriz de Eisenhower
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Priorización 4 Cuadrantes
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Clasificación estratégica automática. Las tareas en cada cuadrante están ordenadas por{' '}
              <strong className="text-slate-700">fecha de entrega más cercana</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
          <span>Orden: Entrega más próxima primero</span>
        </div>
      </div>

      {/* 2x2 Quadrant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => {
          const quadrantTasks = getQuadrantTasks(q.id);
          const IconComp = q.icon;

          return (
            <div
              key={q.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnQuadrant(e, q.id)}
              className={`rounded-2xl border-2 ${q.borderColor} ${q.bgLight} p-3.5 sm:p-4 flex flex-col min-h-[380px] transition-all shadow-xs`}
            >
              {/* Quadrant Header */}
              <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl bg-white shadow-2xs ${q.accentColor}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">{q.title}</h3>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${q.badgeBg} ${q.badgeText} shadow-2xs`}
                      >
                        {quadrantTasks.length}
                      </span>
                    </div>
                    <p className={`text-[11px] font-bold ${q.accentColor}`}>{q.action}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{q.subtitle}</p>
                  </div>
                </div>

                {/* Add task button for this quadrant */}
                <button
                  type="button"
                  onClick={() => onAddTaskToQuadrant(q.id)}
                  className="p-1.5 hover:bg-white text-slate-600 hover:text-blue-600 rounded-xl transition-all cursor-pointer shadow-2xs border border-transparent hover:border-slate-200"
                  title={`Crear nueva tarea en ${q.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Task Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {quadrantTasks.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-slate-400">
                    <IconComp className="w-8 h-8 mb-1.5 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">Sin tareas en este cuadrante</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                      Arrastra tareas aquí o pulsa (+) para agregar una tarea clasificada.
                    </p>
                  </div>
                ) : (
                  quadrantTasks.map((task) => (
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
  );
};
