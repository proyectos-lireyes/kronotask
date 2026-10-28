import React from 'react';
import { TaskItem, CustomTag, Board } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { detectTaskStatusMismatch, calculateTaskUrgencyInfo, getQuadrantStyle } from '../utils/prioritySort';
import {
  CheckCircle2,
  Flag,
  Hourglass,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  MessageSquare,
  Zap,
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

  // El color de la tarjeta refleja directamente el cuadrante (1 al 9) de la matriz según su puntaje
  const getCardColorClass = () => {
    if (isDone) {
      return 'border-l-4 border-l-slate-400 border-slate-300 bg-slate-100/80 text-slate-600 opacity-70';
    }
    const qStyle = getQuadrantStyle(urgencyInfo.quadrantNumber);
    return `border-l-4 ${qStyle.borderLeft} ${qStyle.borderColor} ${qStyle.bgLight} ${qStyle.hoverBg} text-slate-900 shadow-2xs`;
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={() => onSelect(task)}
      className={`group relative rounded-xl border p-2.5 transition-all duration-200 hover:shadow-xs cursor-pointer select-none active:scale-[0.99] animate-in fade-in slide-in-from-bottom-3 duration-300 ${getCardColorClass()}`}
      title="Toca para ver o editar la información completa"
    >
      {/* Top Row: Title + Quick Complete Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h3
            className={`text-xs sm:text-[13px] font-bold leading-snug transition-colors truncate ${
              isDone
                ? 'line-through text-slate-400 font-normal'
                : isBlack
                ? 'text-stone-100 group-hover:text-amber-300'
                : 'text-slate-900 group-hover:text-blue-700'
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
              : isBlack
              ? 'text-stone-400 hover:text-emerald-400 hover:bg-stone-800'
              : 'text-slate-400 hover:text-emerald-600 hover:bg-white/80'
          }`}
          title={isDone ? 'Reabrir tarea' : 'Marcar como completada'}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

      {/* System Status Mismatch Detector Badge */}
      {mismatch.isMismatched && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, mismatch.suggestedStatus);
          }}
          className={`mt-1.5 p-1 px-2 rounded-lg border flex items-center justify-between gap-1 text-[10px] font-bold cursor-pointer transition-transform active:scale-[0.98] ${mismatch.badgeColor}`}
          title={`${mismatch.reason} Click para mover a ${mismatch.suggestedStatusLabel}.`}
        >
          <span className="flex items-center gap-1 truncate">
            <Zap className="w-3 h-3 shrink-0 animate-pulse text-amber-500" />
            <span className="truncate">{mismatch.badgeLabel}</span>
          </span>
          <span className="shrink-0 text-[9px] font-extrabold bg-white/40 px-1.5 py-0.5 rounded shadow-2xs">
            Cambiar
          </span>
        </div>
      )}

      {/* Q6 Direct-to-Q2 Special Alert Badge */}
      {!isDone && urgencyInfo.isQ6DirectToQ2Alert && (
        <div
          className="mt-1.5 p-1 px-2 rounded-lg bg-sky-500/15 text-sky-900 border border-sky-300 flex items-center gap-1 text-[10px] font-bold"
          title="Esta tarea inicia y termina antes del siguiente domingo. Al iniciar pasará directamente a Q2."
        >
          <Zap className="w-3 h-3 text-sky-600 shrink-0 animate-pulse" />
          <span className="truncate">⚡ Alerta Q6: Inicia y Termina Esta Semana</span>
        </div>
      )}

      {/* Bottom Row: Badges (Semáforo, Prioridad, Espera, Meta) */}
      <div
        className={`flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t text-[10px] ${
          isBlack ? 'border-stone-800 text-stone-400' : 'border-slate-200/70 text-slate-500'
        }`}
      >
        {/* Left tags / countdown */}
        <div className="flex items-center gap-1 overflow-hidden flex-wrap">
          {/* Semáforo Remaining Badge */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[110px] ${timeCalc.badgeBg}`}
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
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold shrink-0"
              title={`En espera máx 4 días: ${waitingRemainingText}`}
            >
              <Hourglass className="w-2.5 h-2.5 animate-spin" />
              <span>{waitingRemainingText}</span>
            </span>
          )}

          {/* Board Badge (if Master View) */}
          {board && isMasterView && (
            <span
              className="px-1.5 py-0.5 rounded-md text-white font-bold truncate max-w-[70px] shadow-2xs"
              style={{ backgroundColor: board.color }}
              title={`Tablero: ${board.name}`}
            >
              {board.name}
            </span>
          )}

          {/* Priority */}
          <span
            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-semibold capitalize shrink-0 ${
              isBlack ? 'bg-stone-800 text-stone-300' : 'bg-white/80 text-slate-700 border border-slate-200/60'
            }`}
          >
            <Flag className="w-2.5 h-2.5 text-slate-400" />
            <span className="truncate max-w-[55px]">{task.priority}</span>
          </span>

          {/* 3D Quadrant & Score Pill */}
          {!isDone && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-black text-[10px] shrink-0 ${
                urgencyInfo.quadrantNumber <= 3
                  ? 'bg-rose-100/90 text-rose-800 border border-rose-300/80'
                  : urgencyInfo.quadrantNumber <= 6
                  ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title={`Matriz Q${urgencyInfo.quadrantNumber}: ${urgencyInfo.score.toFixed(2)} pts (${urgencyInfo.isOverdue ? `${urgencyInfo.hoursOverdue.toFixed(1)}h vencida` : `${urgencyInfo.targetHours.toFixed(1)}h restantes`}, Criticidad C${urgencyInfo.criticidad})`}
            >
              Q{urgencyInfo.quadrantNumber} · {urgencyInfo.score.toFixed(2)} pts
            </span>
          )}

          {/* Friction Badge if task was blocked previously */}
          {!isDone && !!task.frictionPoints && task.frictionPoints > 0 && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shrink-0"
              title={`Historial de Fricción: +${task.frictionPoints} pts acumulados por entrar a En Espera`}
            >
              🔒+{task.frictionPoints}
            </span>
          )}

          {/* Primary Tag (if any) */}
          {task.tags && task.tags.length > 0 && (
            <span
              className={`hidden sm:inline-block px-1.5 py-0.5 rounded font-medium truncate max-w-[65px] ${
                isBlack ? 'bg-stone-800 text-sky-300' : 'bg-blue-100/70 text-blue-800'
              }`}
            >
              #{task.tags[0]}
            </span>
          )}
        </div>

        {/* Right meta icons & fast step transition buttons */}
        <div
          className={`flex items-center gap-1 shrink-0 ${
            isBlack ? 'text-stone-400' : 'text-slate-400'
          }`}
        >
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5" title="Archivos adjuntos">
              <Paperclip className="w-3 h-3" />
              <span className="text-[9px] font-bold">{task.attachments.length}</span>
            </span>
          )}

          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5" title="Comentarios">
              <MessageSquare className="w-3 h-3" />
              <span className="text-[9px] font-bold">{task.comments.length}</span>
            </span>
          )}

          {/* Micro arrow moves */}
          <div className="flex items-center">
            {task.status !== 'todo' && (
              <button
                type="button"
                onClick={handleMoveLeft}
                className={`p-0.5 rounded cursor-pointer ${
                  isBlack ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-black/5 text-slate-400 hover:text-slate-700'
                }`}
                title="Mover a etapa anterior"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            {task.status !== 'in_review' && !isDone && (
              <button
                type="button"
                onClick={handleMoveRight}
                className={`p-0.5 rounded cursor-pointer ${
                  isBlack ? 'hover:bg-stone-800 text-stone-400 hover:text-stone-200' : 'hover:bg-black/5 text-slate-400 hover:text-slate-700'
                }`}
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
