import React, { useState } from 'react';
import { TaskItem, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';

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

  // Days grid
  const days: { dayNumber: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Current month days
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Month Header Navigation */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
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
          <div key={`blank-${index}`} className="min-h-[110px] bg-slate-50/40 p-2" />
        ))}

        {days.map(({ dayNumber, date }) => {
          const dayTasks = getTasksForDate(date);
          const currentDayActive = isToday(date);

          return (
            <div
              key={dayNumber}
              className={`min-h-[110px] p-2 transition-colors relative flex flex-col group ${
                currentDayActive ? 'bg-blue-50/30' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    currentDayActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700'
                  }`}
                >
                  {dayNumber}
                </span>

                {onAddTaskOnDate && (
                  <button
                    onClick={() => onAddTaskOnDate(date)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                    title="Añadir tarea en este día"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tasks list in this day */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                {dayTasks.map((t) => {
                  const isDone = t.status === 'done';
                  const timeCalc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), isDone);
                  const taskBoard = allBoards?.find((b) => b.id === t.boardId);

                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t)}
                      className={`px-2 py-1 rounded text-[11px] font-medium truncate cursor-pointer transition-transform hover:scale-[1.02] border flex items-center gap-1 ${timeCalc.badgeBg}`}
                      title={`${t.title} - Tablero: ${taskBoard?.name || 'General'} - Fin: ${new Date(t.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    >
                      {isMasterView && taskBoard && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: taskBoard.color }}
                        />
                      )}
                      <span className="font-bold truncate">{t.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
