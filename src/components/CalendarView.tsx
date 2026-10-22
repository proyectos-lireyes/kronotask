import React, { useState } from 'react';
import { TaskItem, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Calendar as CalendarIcon,
  X,
  ChevronRight as ArrowRight,
  Flag,
  CheckCircle2,
} from 'lucide-react';

interface CalendarViewProps {
  tasks: TaskItem[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onAddTaskOnDate?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  allBoards,
  isMasterView,
  onSelectTask,
  onAddTaskOnDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startingDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Current month days
  const days: { dayNumber: number; isCurrentMonth: boolean; date: Date }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  const getTasksForDate = (date: Date) => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    return tasks.filter((t) => {
      const taskEnd = new Date(t.endDate).getTime();
      const taskStart = new Date(t.startDate).getTime();
      return (
        (taskEnd >= startOfDay && taskEnd <= endOfDay) ||
        (taskStart >= startOfDay && taskStart <= endOfDay) ||
        (taskStart <= startOfDay && taskEnd >= endOfDay)
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  const selectedDateTasks = selectedDayDate ? getTasksForDate(selectedDayDate) : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Month Header Navigation */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">
            {monthNames[month]} {year}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/60 text-center py-2 text-xs font-bold text-slate-600">
        {weekDayNames.map((dayName) => (
          <div key={dayName}>{dayName}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {/* Leading empty cells */}
        {Array.from({ length: startingDay }).map((_, index) => (
          <div key={`blank-${index}`} className="min-h-[90px] sm:min-h-[110px] bg-slate-50/40 p-2" />
        ))}

        {days.map(({ dayNumber, date }) => {
          const dayTasks = getTasksForDate(date);
          const currentDayActive = isToday(date);

          return (
            <div
              key={dayNumber}
              onClick={() => setSelectedDayDate(date)}
              className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 transition-all relative flex flex-col group cursor-pointer active:scale-[0.99] ${
                currentDayActive ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                    currentDayActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 group-hover:bg-slate-200'
                  }`}
                >
                  {dayNumber}
                </span>

                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              {/* Tasks list in this day */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => {
                  const isDone = t.status === 'done';
                  const timeCalc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), isDone);

                  return (
                    <div
                      key={t.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border flex items-center gap-1 ${timeCalc.badgeBg}`}
                    >
                      <span className="truncate">{t.title}</span>
                    </div>
                  );
                })}

                {dayTasks.length > 3 && (
                  <p className="text-[9px] font-bold text-slate-500 pl-1">
                    +{dayTasks.length - 3} más...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Sheet for Selected Day Tasks */}
      {selectedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 capitalize">
                    {selectedDayDate.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedDateTasks.length === 1
                      ? '1 tarea en este día'
                      : `${selectedDateTasks.length} tareas en este día`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task list for this day */}
            <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
              {selectedDateTasks.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">
                    No hay tareas programadas para este día
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Puedes crear una nueva tarea para esta fecha.
                  </p>
                </div>
              ) : (
                selectedDateTasks.map((task) => {
                  const isDone = task.status === 'done';
                  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, Date.now(), isDone);
                  const taskBoard = allBoards?.find((b) => b.id === task.boardId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        onSelectTask(task);
                        setSelectedDayDate(null);
                      }}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isMasterView && taskBoard && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: taskBoard.color }}
                            >
                              {taskBoard.name}
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${timeCalc.badgeBg}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                timeCalc.isOverdue && !isDone
                                  ? 'bg-amber-400 animate-ping'
                                  : timeCalc.level === 'red'
                                  ? 'bg-rose-500'
                                  : 'bg-current'
                              }`}
                            />
                            {timeCalc.remainingText}
                          </span>

                          <span className="text-[10px] capitalize font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {task.priority}
                          </span>
                        </div>

                        <h4
                          className={`text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors break-words ${
                            isDone ? 'line-through text-slate-400 font-normal' : ''
                          }`}
                        >
                          {task.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(task.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {task.type && (
                            <span className="capitalize font-medium text-slate-500">
                              {task.type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-1.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with "+ Nueva tarea" and Close */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              {onAddTaskOnDate && (
                <button
                  type="button"
                  onClick={() => {
                    const targetDate = selectedDayDate;
                    setSelectedDayDate(null);
                    onAddTaskOnDate(targetDate);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir tarea en este día</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedDayDate(null)}
                className="ml-auto px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
