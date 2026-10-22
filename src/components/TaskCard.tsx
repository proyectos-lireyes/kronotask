import React from 'react';
import { TaskItem, CustomTag, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import {
  Clock,
  Repeat,
  Paperclip,
  MessageSquare,
  CheckCircle2,
  Flag,
  Hourglass,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundService } from '../services/notifications';

interface TaskCardProps {
  task: TaskItem;
  allTags: CustomTag[];
  board?: Board;
  isMasterView?: boolean;
  onSelect: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskItem['status']) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  allTags,
  board,
  isMasterView,
  onSelect,
  onStatusChange,
  onDragStart,
}) => {
  const isDone = task.status === 'done';
  const isWaiting = task.status === 'waiting';
  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, Date.now(), isDone);

  // Calculate 4-day waiting remaining time if applicable
  let waitingRemainingText = '';
  if (isWaiting && task.waitingSince) {
    const elapsedMs = Date.now() - new Date(task.waitingSince).getTime();
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
    const remainingWaitingMs = Math.max(0, fourDaysMs - elapsedMs);
    const hoursLeft = Math.floor(remainingWaitingMs / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    const remHours = hoursLeft % 24;
    waitingRemainingText = `${daysLeft}d ${remHours}h`;
  }

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDone) {
      soundService.playChime('complete');
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
      });
      onStatusChange(task.id, 'done');
    } else {
      onStatusChange(task.id, 'in_progress');
    }
  };

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: TaskItem['status'][] = ['todo', 'in_progress', 'waiting', 'in_review'];
    const currIdx = order.indexOf(task.status);
    if (currIdx > 0) {
      onStatusChange(task.id, order[currIdx - 1]);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: TaskItem['status'][] = ['todo', 'in_progress', 'waiting', 'in_review'];
    const currIdx = order.indexOf(task.status);
    if (currIdx < order.length - 1) {
      onStatusChange(task.id, order[currIdx + 1]);
    } else {
      handleComplete(e);
    }
  };

  // Border class with left-accent strip for Semáforo level
  const getCardBorderClass = () => {
    if (isDone) return 'border-l-4 border-l-slate-400 border-slate-200 bg-slate-50/70 opacity-75';
    if (isWaiting) return 'border-l-4 border-l-purple-500 border-purple-200 bg-white hover:border-purple-300';

    switch (timeCalc.level) {
      case 'black':
        return 'border-l-4 border-l-black border-stone-300 bg-stone-50/40 hover:border-black';
      case 'red':
        return 'border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/20 hover:border-rose-400';
      case 'orange':
        return 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/20 hover:border-amber-400';
      case 'yellow':
        return 'border-l-4 border-l-yellow-400 border-yellow-200 bg-yellow-50/20 hover:border-yellow-400';
      case 'blue':
        return 'border-l-4 border-l-sky-500 border-sky-200 bg-sky-50/20 hover:border-sky-400';
      case 'green':
      default:
        return 'border-l-4 border-l-emerald-500 border-emerald-200 bg-emerald-50/10 hover:border-emerald-400';
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className={`group relative rounded-xl border p-2 sm:p-2.5 transition-all duration-150 hover:shadow-xs cursor-pointer select-none active:scale-[0.99] ${getCardBorderClass()}`}
      title="Toca para ver o editar la información completa"
    >
      {/* Top Row: Title + Quick Complete Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h3
            className={`text-xs sm:text-[13px] font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors truncate ${
              isDone ? 'line-through text-slate-400 font-normal' : ''
            }`}
          >
            {task.title}
          </h3>
        </div>

        {/* Quick Complete / Checkmark */}
        <button
          type="button"
          onClick={handleComplete}
          className={`shrink-0 p-1 rounded-lg transition-colors cursor-pointer ${
            isDone
              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
              : 'text-slate-300 hover:text-emerald-600 hover:bg-slate-100'
          }`}
          title={isDone ? 'Reabrir tarea' : 'Marcar como completada'}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Row: Ultra-Compact Essential Badges (Semáforo, Prioridad, Espera, Meta) */}
      <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1 border-t border-slate-100/80 text-[10px]">
        {/* Left tags / countdown */}
        <div className="flex items-center gap-1 overflow-hidden flex-wrap">
          {/* Semáforo Remaining Badge */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md font-bold truncate max-w-[100px] ${timeCalc.badgeBg}`}
            title={`Nivel ${timeCalc.label}: ${timeCalc.remainingText}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                timeCalc.isOverdue && !isDone
                  ? 'bg-amber-400 animate-ping'
                  : timeCalc.level === 'red'
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-current'
              }`}
            />
            <span className="truncate">{timeCalc.remainingText}</span>
          </span>

          {/* En Espera Badge */}
          {isWaiting && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 font-bold shrink-0"
              title={`En espera máx 4 días: ${waitingRemainingText}`}
            >
              <Hourglass className="w-2.5 h-2.5 animate-spin" />
              <span>{waitingRemainingText}</span>
            </span>
          )}

          {/* Board Badge (if Master View) */}
          {board && isMasterView && (
            <span
              className="px-1.5 py-0.2 rounded-md text-white font-bold truncate max-w-[70px] shadow-2xs"
              style={{ backgroundColor: board.color }}
              title={`Tablero: ${board.name}`}
            >
              {board.name}
            </span>
          )}

          {/* Priority */}
          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold capitalize shrink-0">
            <Flag className="w-2.5 h-2.5 text-slate-400" />
            <span className="truncate max-w-[55px]">{task.priority}</span>
          </span>

          {/* Primary Tag (if any) */}
          {task.tags && task.tags.length > 0 && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-medium truncate max-w-[65px]">
              #{task.tags[0]}
            </span>
          )}
        </div>

        {/* Right meta icons & fast step transition buttons */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5" title="Archivos adjuntos">
              <Paperclip className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-bold">{task.attachments.length}</span>
            </span>
          )}

          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5" title="Comentarios">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-bold">{task.comments.length}</span>
            </span>
          )}

          {/* Micro arrow moves (on hover / mobile) */}
          <div className="flex items-center">
            {task.status !== 'todo' && (
              <button
                type="button"
                onClick={handleMoveLeft}
                className="p-0.5 hover:bg-slate-200/80 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Mover a etapa anterior"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            {task.status !== 'in_review' && !isDone && (
              <button
                type="button"
                onClick={handleMoveRight}
                className="p-0.5 hover:bg-slate-200/80 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Avanzar etapa"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
