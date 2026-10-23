import React from 'react';
import { TaskItem, CustomTag, TaskStatus, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { formatRecurrenceLabel } from '../utils/recurrence';
import { CheckCircle2, Clock, Calendar, Flag, Repeat, Paperclip, MessageSquare } from 'lucide-react';

interface TaskListViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  allTags,
  allBoards,
  isMasterView,
  onSelectTask,
  onStatusChange,
}) => {
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              {isMasterView && <th className="py-3 px-4">Tablero</th>}
              <th className="py-3 px-4 min-w-[240px]">Tarea</th>
              <th className="py-3 px-4">Semáforo de Tiempo</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Prioridad</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Fecha Fin (Límite)</th>
              <th className="py-3 px-4">Periodicidad</th>
              <th className="py-3 px-4">Etiquetas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={isMasterView ? 10 : 9} className="py-12 text-center text-slate-400">
                  No se encontraron tareas con los filtros actuales.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isDone = task.status === 'done';
                const timeCalc = calculateTimeLevel(task.startDate, task.endDate, Date.now(), isDone);
                const taskBoard = allBoards?.find((b) => b.id === task.boardId);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onStatusChange(task.id, isDone ? 'in_progress' : 'done')}
                        className={`p-1 rounded-md cursor-pointer ${
                          isDone ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </td>

                    {isMasterView && (
                      <td className="py-3 px-4">
                        {taskBoard ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: taskBoard.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            {taskBoard.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">General</span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4 min-w-[240px]">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm break-words whitespace-normal leading-snug">
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 break-words">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        {task.attachments.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Paperclip className="w-3 h-3" /> {task.attachments.length}
                          </span>
                        )}
                        {task.comments.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" /> {task.comments.length}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${timeCalc.badgeBg}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            timeCalc.isOverdue && !isDone
                              ? 'bg-amber-400 animate-ping'
                              : timeCalc.level === 'red'
                              ? 'bg-rose-500'
                              : 'bg-current'
                          }`}
                        />
                        {timeCalc.remainingText}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-medium capitalize bg-slate-100 text-slate-700">
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize font-semibold text-slate-700 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-slate-400" />
                        {task.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4 capitalize text-slate-600">{task.type}</td>

                    <td className="py-3 px-4 text-slate-600">
                      {new Date(task.endDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {task.recurrence?.enabled ? (
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Repeat className="w-3 h-3" />
                          {formatRecurrenceLabel(task.recurrence)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tagName) => {
                          const tagObj = allTags.find((t) => t.name === tagName);
                          const color = tagObj?.color || '#64748b';
                          return (
                            <span
                              key={tagName}
                              className="px-2 py-0.2 rounded-md font-semibold text-[10px]"
                              style={{
                                backgroundColor: `${color}15`,
                                color: color,
                                border: `1px solid ${color}30`,
                              }}
                            >
                              #{tagName}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
