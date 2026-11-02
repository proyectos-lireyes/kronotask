import React, { useState } from 'react';
import { TaskItem, CustomTag, Board } from '../types';
import { formatRecurrenceLabel } from '../utils/recurrence';
import {
  CheckCircle2,
  RotateCcw,
  Calendar,
  Search,
  Tag,
  Clock,
  Repeat,
  Info,
  Filter,
} from 'lucide-react';

interface HistoryViewProps {
  completedTasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onReopenTask: (taskId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  completedTasks,
  allTags,
  allBoards,
  isMasterView,
  onSelectTask,
  onReopenTask,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'recurring' | 'single'>('all');

  const filtered = completedTasks.filter((t) => {
    if (filterMode === 'recurring' && !t.recurrence?.enabled) return false;
    if (filterMode === 'single' && t.recurrence?.enabled) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const onTimeCount = completedTasks.filter((t) => {
    const end = new Date(t.endDate).getTime();
    const completed = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
    return completed <= end;
  }).length;

  const onTimePercent =
    completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;

  const recurringCount = completedTasks.filter((t) => t.recurrence?.enabled).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-4 sm:p-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Historial & Evaluación de Cumplimiento</h2>
              <p className="text-xs text-slate-500">
                Registro con evidencia de entrega (A tiempo vs. Con retraso) para tareas periódicas y únicas
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-xs font-black text-slate-800">{completedTasks.length}</span>
            <span className="text-[10px] text-slate-500 block">Total</span>
          </div>
          <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
            <span className="text-xs font-black text-indigo-700">{recurringCount}</span>
            <span className="text-[10px] text-indigo-800 block">Periódicas</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="text-xs font-black text-emerald-700">{onTimePercent}%</span>
            <span className="text-[10px] text-emerald-800 block">A Tiempo</span>
          </div>
        </div>
      </div>

      {/* Info Banner on Periodic Task Compliance */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-2 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-indigo-950">
            ¿Cómo saber si cumpliste a tiempo una tarea mensual o periódica?
          </p>
          <p className="text-[11px] leading-relaxed text-indigo-800">
            Cada vez que completas un ciclo (mensual, semanal, etc.), la aplicación compara la fecha/hora real de entrega (<strong className="text-indigo-950">Entregada</strong>) contra el límite asignado para ese mes (<strong className="text-indigo-950">Límite</strong>). Si la entregaste antes del límite queda marcada como <span className="font-bold text-emerald-700">A tiempo</span>; si la entregaste después, queda registrada como <span className="font-bold text-rose-700">Con retraso</span>, mientras el sistema crea automáticamente el siguiente ciclo.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el historial..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        {/* Filter Toggle: All vs Periodic vs Single */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({completedTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('recurring')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'recurring'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-3 h-3 text-indigo-600" />
            <span>Periódicas ({recurringCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('single')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterMode === 'single'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Únicas ({completedTasks.length - recurringCount})
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {completedTasks.length === 0
              ? 'Aún no hay tareas completadas en este tablero.'
              : 'No se encontraron tareas coincidentes en el historial.'}
          </div>
        ) : (
          filtered.map((task) => {
            const end = new Date(task.endDate).getTime();
            const completed = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
            const wasOnTime = completed <= end;
            const diffHours = Math.abs(completed - end) / (1000 * 60 * 60);

            const taskBoard = allBoards?.find((b) => b.id === task.boardId);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="py-3 px-2 hover:bg-slate-50/80 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  <div className="truncate space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {task.title}
                      </span>

                      {/* Recurrence Badge */}
                      {task.recurrence?.enabled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Repeat className="w-3 h-3 text-indigo-600" />
                          <span>{formatRecurrenceLabel(task.recurrence)}</span>
                        </span>
                      )}

                      {/* Master Board Badge */}
                      {isMasterView && taskBoard && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs"
                          style={{ backgroundColor: taskBoard.color }}
                        >
                          {taskBoard.name}
                        </span>
                      )}

                      {/* Result Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wasOnTime
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {wasOnTime ? '✅ A tiempo' : `🚨 Con retraso (${diffHours > 24 ? `${Math.round(diffHours / 24)}d tardíos` : `${Math.round(diffHours)}h tardías`})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Límite: {new Date(task.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        {new Date(task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        Entregada: {task.completedAt
                          ? `${new Date(task.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Fecha no registrada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reopen Action Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopenTask(task.id);
                    }}
                    className="p-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-semibold cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                    title="Mover de vuelta al tablero Kanban"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reabrir</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
