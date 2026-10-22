import React, { useState } from 'react';
import { TaskItem, TaskStatus, CustomTag, TimeColorLevel, Board } from '../types';
import { TaskCard } from './TaskCard';
import {
  Plus,
  CircleDot,
  Timer,
  PauseCircle,
  Eye,
} from 'lucide-react';
import { calculateTimeLevel } from '../utils/timeColor';

interface KanbanBoardProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTaskToColumn: (status: TaskStatus) => void;
  filterColor: TimeColorLevel | 'all';
  filterPriority: string;
  filterType: string;
  filterTag: string;
  searchQuery: string;
}

interface ColumnDef {
  id: TaskStatus;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  headerBg: string;
  badgeBg: string;
}

const ACTIVE_COLUMNS: ColumnDef[] = [
  {
    id: 'todo',
    title: 'Por Hacer',
    subtitle: 'Pendientes por iniciar',
    icon: CircleDot,
    iconColor: 'text-slate-500',
    headerBg: 'bg-slate-50 border-slate-200',
    badgeBg: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'in_progress',
    title: 'En Progreso',
    subtitle: 'En desarrollo activo',
    icon: Timer,
    iconColor: 'text-blue-600',
    headerBg: 'bg-blue-50/70 border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'waiting',
    title: 'En Espera',
    subtitle: 'Máx 4 días (auto reactiva)',
    icon: PauseCircle,
    iconColor: 'text-purple-600',
    headerBg: 'bg-purple-50/70 border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'in_review',
    title: 'En Revisión',
    subtitle: 'Control de calidad',
    icon: Eye,
    iconColor: 'text-amber-600',
    headerBg: 'bg-amber-50/70 border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  allTags,
  allBoards,
  isMasterView,
  onSelectTask,
  onStatusChange,
  onAddTaskToColumn,
  filterColor,
  filterPriority,
  filterType,
  filterTag,
  searchQuery,
}) => {
  const [draggedOverCol, setDraggedOverCol] = useState<TaskStatus | null>(null);
  const [mobileActiveCol, setMobileActiveCol] = useState<TaskStatus>('todo');

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (draggedOverCol !== colId) {
      setDraggedOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, colId);
    }
  };

  const getFilteredTasksForColumn = (status: TaskStatus) => {
    return tasks.filter((t) => {
      if (t.status !== status) return false;

      // Filter by color level if selected
      if (filterColor !== 'all') {
        const timeCalc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), t.status === 'done');
        if (timeCalc.level !== filterColor) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;

      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Tag filter
      if (filterTag !== 'all' && !t.tags.includes(filterTag)) return false;

      return true;
    });
  };

  return (
    <div className="w-full">
      {/* Mobile Column Navigation: ONLY ICONS + BADGES (sleek, modern design) */}
      <div className="md:hidden grid grid-cols-4 gap-1.5 pb-2 mb-2.5">
        {ACTIVE_COLUMNS.map((col) => {
          const count = getFilteredTasksForColumn(col.id).length;
          const isActive = mobileActiveCol === col.id;
          const IconComp = col.icon;
          return (
            <button
              key={col.id}
              onClick={() => setMobileActiveCol(col.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
              title={`${col.title} (${count})`}
            >
              <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : col.iconColor}`} />
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {ACTIVE_COLUMNS.map((col) => {
          const colTasks = getFilteredTasksForColumn(col.id);
          const isDragOver = draggedOverCol === col.id;
          const isMobileVisible = mobileActiveCol === col.id;
          const IconComp = col.icon;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col bg-slate-50/70 rounded-2xl border transition-all duration-150 min-h-[460px] ${
                isDragOver ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-300' : 'border-slate-200/90'
              } ${isMobileVisible ? 'flex' : 'hidden md:flex'}`}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-t-2xl border-b ${col.headerBg}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <IconComp className={`w-4 h-4 shrink-0 ${col.iconColor}`} />
                    <h2 className="text-sm font-bold text-slate-800">{col.title}</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium ml-6 hidden sm:block">
                    {col.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddTaskToColumn(col.id)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title={`Añadir tarea a ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Column Task List - tight spacing to fit 5 tasks on screen */}
              <div className="p-2 space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl my-auto">
                    <p className="text-xs text-slate-400 font-medium">Sin tareas activas</p>
                    <button
                      type="button"
                      onClick={() => onAddTaskToColumn(col.id)}
                      className="mt-2 text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear tarea
                    </button>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const taskBoard = allBoards?.find((b) => b.id === task.boardId);
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        allTags={allTags}
                        board={taskBoard}
                        isMasterView={isMasterView}
                        onSelect={onSelectTask}
                        onStatusChange={onStatusChange}
                        onDragStart={handleDragStart}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
