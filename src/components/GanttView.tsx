import React, { useState, useRef, useMemo, useEffect } from 'react';
import { TaskItem, CustomTag, Board, CustomPriorityDefinition } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { sortTasksByPriorityAndUrgency, sortTasksByDeadlineAndPriority } from '../utils/prioritySort';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Clock, ArrowUpDown, ChevronDown } from 'lucide-react';
import { OptionPickerModal, PickerOption } from './OptionPickerModal';

interface GanttViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  allPriorities?: CustomPriorityDefinition[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
}

type GanttSortMode = 'start_date' | 'priority' | 'deadline';

export const GanttView: React.FC<GanttViewProps> = ({
  tasks,
  allTags,
  allBoards,
  allPriorities,
  isMasterView,
  onSelectTask,
}) => {
  const [zoomDays, setZoomDays] = useState<number>(14); // 7, 14, 30 days
  const [startDateOffset, setStartDateOffset] = useState<number>(-2); // days before today to start timeline
  const [isSortPickerOpen, setIsSortPickerOpen] = useState(false);
  const [ganttSortMode, setGanttSortMode] = useState<GanttSortMode>(() => {
    try {
      const saved = localStorage.getItem('chronotask_gantt_sort_mode');
      if (saved && ['start_date', 'priority', 'deadline'].includes(saved)) {
        return saved as GanttSortMode;
      }
    } catch (e) {
      console.error(e);
    }
    return 'start_date'; // Default by start date as requested
  });

  useEffect(() => {
    try {
      localStorage.setItem('chronotask_gantt_sort_mode', ganttSortMode);
    } catch (e) {
      console.error(e);
    }
  }, [ganttSortMode]);

  const sortedGanttTasks = useMemo(() => {
    if (ganttSortMode === 'priority') {
      return sortTasksByPriorityAndUrgency(tasks, allPriorities);
    }
    if (ganttSortMode === 'deadline') {
      return sortTasksByDeadlineAndPriority(tasks, allPriorities);
    }
    // Default: 'start_date' (earliest start date first)
    return [...tasks].sort((a, b) => {
      const startA = new Date(a.startDate).getTime();
      const startB = new Date(b.startDate).getTime();
      if (startA !== startB) return startA - startB;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });
  }, [tasks, allPriorities, ganttSortMode]);

  const ganttSortOptions: PickerOption[] = [
    {
      id: 'start_date',
      label: '📅 Por Fecha de Inicio (Predeterminado)',
      description: 'Ordena cronológicamente según la fecha de comienzo de la tarea',
    },
    {
      id: 'priority',
      label: '⚡ Por Prioridad y Urgencia (Matriz 3x3)',
      description: 'Ordena por el puntaje de prioridad e importancia de la matriz',
    },
    {
      id: 'deadline',
      label: '🎯 Por Fecha Límite de Entrega',
      description: 'Ordena colocando primero las tareas con entrega más cercana',
    },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timelineStart = new Date(today);
  timelineStart.setDate(timelineStart.getDate() + startDateOffset);

  const daysList: Date[] = [];
  for (let i = 0; i < zoomDays; i++) {
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + i);
    daysList.push(d);
  }

  const timelineEnd = new Date(timelineStart);
  timelineEnd.setDate(timelineEnd.getDate() + zoomDays);

  const totalTimelineMs = timelineEnd.getTime() - timelineStart.getTime();

  // Scroll to 'today' on initial mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getPositionPercent = (dateStr: string) => {
    const date = new Date(dateStr).getTime();
    const pos = ((date - timelineStart.getTime()) / totalTimelineMs) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const getWidthPercent = (startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    const clampedStart = Math.max(timelineStart.getTime(), start);
    const clampedEnd = Math.min(timelineEnd.getTime(), end);

    if (clampedEnd <= clampedStart) return 3; // minimal visible width

    const width = ((clampedEnd - clampedStart) / totalTimelineMs) * 100;
    return Math.max(3, Math.min(100, width));
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Gantt Top Controls Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Left Header Container: Title + Aligned Modal Sort Selector on the SAME line */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-800 shrink-0">Diagrama de Gantt</h2>

          {/* Gantt Modal Selector Button (Aligned right beside title) */}
          <button
            type="button"
            onClick={() => setIsSortPickerOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer transition-all active:scale-95"
            title="Cambiar criterio de ordenación del Gantt"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {ganttSortMode === 'start_date'
                ? '📅 Por Fecha de Inicio'
                : ganttSortMode === 'priority'
                ? '⚡ Por Prioridad y Urgencia'
                : '🎯 Por Fecha Límite'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Right Header Container: Timeline Navigation & Zoom */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeline Navigation */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setStartDateOffset((prev) => prev - 3)}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Atrás 3 días"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStartDateOffset(-2)}
              className="px-2 py-0.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={() => setStartDateOffset((prev) => prev + 3)}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              title="Adelante 3 días"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
            {[7, 14, 28].map((days) => (
              <button
                key={days}
                onClick={() => setZoomDays(days)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  zoomDays === days
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days === 7 ? '1 Sem' : days === 14 ? '2 Sem' : '1 Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Option Picker Modal for Gantt Sort Mode */}
      <OptionPickerModal
        isOpen={isSortPickerOpen}
        title="Ordenar Diagrama de Gantt"
        subtitle="Selecciona cómo organizar visualmente la secuencia de tareas"
        icon={ArrowUpDown}
        options={ganttSortOptions}
        selectedValue={ganttSortMode}
        onSelect={(id) => setGanttSortMode(id as GanttSortMode)}
        onClose={() => setIsSortPickerOpen(false)}
      />

      {/* Gantt Timeline View Area */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] select-none"
      >
        <div className="min-w-[700px]">
          {/* Header Days Row */}
          <div className="flex border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 sticky top-0 z-10">
            <div className="w-56 shrink-0 p-2.5 border-r border-slate-200 bg-slate-100">
              Tarea / Semáforo
            </div>
            <div className="flex-1 flex">
              {daysList.map((day, idx) => {
                const isCurrentToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();

                return (
                  <div
                    key={idx}
                    className={`flex-1 p-2 text-center border-r border-slate-200/60 truncate ${
                      isCurrentToday ? 'bg-blue-100/70 text-blue-800 font-black' : ''
                    }`}
                  >
                    <div>{dayNames[day.getDay()]}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay tareas para graficar en este periodo.
              </div>
            ) : (
              sortedGanttTasks.map((task) => {
                const isDone = task.status === 'done';
                const timeCalc = calculateTimeLevel(task.startDate, task.endDate, Date.now(), isDone);
                const leftPos = getPositionPercent(task.startDate);
                const widthPercent = getWidthPercent(task.startDate, task.endDate);

                const getBarColor = () => {
                  if (isDone) return 'bg-emerald-500 text-white';
                  switch (timeCalc.level) {
                    case 'black':
                      return 'bg-stone-900 text-amber-200 ring-2 ring-stone-900';
                    case 'red':
                      return 'bg-rose-500 text-white ring-1 ring-rose-400';
                    case 'orange':
                      return 'bg-amber-500 text-white';
                    case 'yellow':
                      return 'bg-yellow-500 text-slate-900';
                    case 'blue':
                      return 'bg-sky-500 text-white';
                    case 'green':
                    default:
                      return 'bg-emerald-500 text-white';
                  }
                };

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center hover:bg-slate-50 cursor-pointer group transition-colors relative h-12"
                  >
                    {/* Left Meta Column */}
                    <div className="w-56 shrink-0 px-3 py-1.5 border-r border-slate-200 flex items-center justify-between gap-1.5 overflow-hidden">
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          {isMasterView && (() => {
                            const taskBoard = allBoards?.find((b) => b.id === task.boardId);
                            return taskBoard ? (
                              <span
                                className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: taskBoard.color }}
                                title={`Tablero: ${taskBoard.name}`}
                              />
                            ) : null;
                          })()}
                          <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate capitalize">
                          {task.status.replace('_', ' ')} • {task.priority}
                        </span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${
                          timeCalc.level === 'black'
                            ? 'bg-stone-900'
                            : timeCalc.level === 'red'
                            ? 'bg-rose-500'
                            : timeCalc.level === 'orange'
                            ? 'bg-amber-500'
                            : timeCalc.level === 'yellow'
                            ? 'bg-yellow-400'
                            : timeCalc.level === 'blue'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                        }`}
                        title={timeCalc.label}
                      />
                    </div>

                    {/* Timeline Canvas with Bar */}
                    <div className="flex-1 relative h-full flex items-center px-1">
                      {/* Grid vertical guidelines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {daysList.map((day, idx) => {
                          const isCurrentToday =
                            day.getDate() === today.getDate() &&
                            day.getMonth() === today.getMonth() &&
                            day.getFullYear() === today.getFullYear();
                          return (
                            <div
                              key={idx}
                              className={`flex-1 border-r border-slate-100 ${
                                isCurrentToday ? 'bg-blue-50/40 border-r-blue-300' : ''
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* The Gantt Bar */}
                      <div
                        className={`absolute h-7 rounded-lg shadow-xs flex items-center px-2 text-[11px] font-bold truncate transition-all duration-300 z-5 group-hover:shadow-md ${getBarColor()}`}
                        style={{
                          left: `${leftPos}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={`${task.title} (${new Date(task.startDate).toLocaleDateString()} a ${new Date(task.endDate).toLocaleDateString()}) - ${timeCalc.remainingText}`}
                      >
                        <span className="truncate">{task.title}</span>
                        <span className="ml-1 text-[9px] opacity-80 shrink-0">
                          ({timeCalc.percentElapsed.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
