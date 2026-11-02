import React from 'react';
import { TaskItem, CustomTag, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { detectTaskStatusMismatch, calculateTaskUrgencyInfo, getQuadrantStyle } from '../utils/prioritySort';
import { formatRecurrenceLabel } from '../utils/recurrence';
import {
  CheckCircle2,
  Flag,
  Hourglass,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  MessageSquare,
  Zap,
  Repeat,
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
  const mismatch = detectTaskStatusMismatch(task, Date.now());
  const urgencyInfo = calculateTaskUrgencyInfo(task, undefined, Date.now());
  const isBlack = !isDone && timeCalc.level === 'black';

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

  // Las tarjetas tienen fondo blanco/neutro y limpio, con borde izquierdo de color por cuadrante
  const getCardColorClass = () => {
    if (isDone) {
      return 'border-l-4 border-l-slate-400 border-slate-200 bg-slate-50 dark:bg-slate-800/60 text-slate-500 opacity-70';
    }
    const qStyle = getQuadrantStyle(urgencyInfo.quadrantNumber);
    return `border-l-4 ${qStyle.borderLeft} border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 shadow-2xs hover:shadow-xs`;
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className={`group relative rounded-lg border px-2 py-1 transition-all duration-150 hover:shadow-2xs cursor-pointer select-none active:scale-[0.99] animate-in fade-in duration-200 ${getCardColorClass()}`}
      title="Toca para ver o editar la información completa"
    >
      {/* Fila 1 (Arriba): Checkbox + Nombre Completo de la Tarea */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={handleComplete}
          className={`shrink-0 p-0 transition-colors cursor-pointer ${
            isDone
              ? 'text-emerald-600 hover:text-emerald-700'
              : 'text-slate-300 hover:text-emerald-600'
          }`}
          title={isDone ? 'Reabrir tarea' : 'Marcar como completada'}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>

        <h3
          className={`text-xs font-bold leading-tight break-words flex-1 min-w-0 ${
            isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-900 group-hover:text-blue-700'
          }`}
        >
          {task.title}
        </h3>

        {task.attachments.length > 0 && (
          <span className="flex items-center gap-0.5 text-slate-400 shrink-0" title="Archivos adjuntos">
            <Paperclip className="w-3 h-3" />
            <span className="text-[10px] font-bold">{task.attachments.length}</span>
          </span>
        )}
      </div>

      {/* Fila 2 (Abajo): Tiempo Queda/Inicia, Tablero, Criticidad y Flechas (en una sola línea sin desbordar altura) */}
      <div className="flex items-center justify-between gap-1 mt-0.5 min-w-0">
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          {/* 1. Tiempo Queda / Inicia con Horas y Minutos */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-extrabold text-[10px] leading-tight shrink-0 ${timeCalc.badgeBg}`}
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

          {/* 2. Tablero / Etiqueta */}
          {board ? (
            <span
              className="inline-flex items-center px-1.5 py-0.2 rounded text-white font-bold text-[10px] leading-tight shrink-0 shadow-2xs max-w-[85px]"
              style={{ backgroundColor: board.color || '#3b82f6' }}
              title={`Tablero: ${board.name}`}
            >
              <span className="truncate">{board.name}</span>
            </span>
          ) : task.tags && task.tags.length > 0 ? (
            <span
              className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-100/80 text-blue-800 font-bold text-[10px] leading-tight shrink-0 max-w-[80px]"
              title={`Etiqueta: ${task.tags[0]}`}
            >
              <span className="truncate">#{task.tags[0]}</span>
            </span>
          ) : null}

          {/* 3. Criticidad */}
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold text-[10px] leading-tight bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0"
            title={`Criticidad: ${task.priority}`}
          >
            <Flag className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="capitalize">{task.priority}</span>
          </span>
        </div>

        {/* 4. Flechas para cambiar de estado */}
        <div className="flex items-center shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleMoveLeft}
            className="p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Mover a estado anterior"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleMoveRight}
            className="p-0.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Mover a siguiente estado"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
