import React, { useState, useRef, useEffect } from 'react';
import { TaskItem, CustomTag, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Clock } from 'lucide-react';

interface GanttViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({
  tasks,
  allTags,
  allBoards,
  isMasterView,
  onSelectTask,
}) => {
  const [zoomDays, setZoomDays] = useState<number>(14); // 7, 14, 30 days
  const [startDateOffset, setStartDateOffset] = useState<number>(-2); // days before today to start timeline

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
      {/* Gantt Top Controls */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Diagrama de Gantt</h2>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Cronograma interactivo de entregas y duraciones
          </span>
        </div>

        <div className="flex items-center gap-2">
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
              tasks.map((task) => {
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
