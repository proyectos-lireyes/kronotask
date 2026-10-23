import React, { useState } from 'react';
import { Board, TaskItem, CustomTag } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import {
  detectCollisions,
  isEventType,
  TaskCollision,
} from '../utils/collisionUtils';
import { OptionPickerModal } from './OptionPickerModal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  Flag,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Undo2,
  CalendarClock,
  Sparkle,
} from 'lucide-react';

interface GlobalDashboardViewProps {
  allTasks: TaskItem[];
  allBoards: Board[];
  allTags: CustomTag[];
  acceptedCollisions?: string[];
  onSelectTask: (task: TaskItem) => void;
  onResolveCollision?: (taskIdToMove: string, newStartIso: string, newEndIso: string) => void;
  onToggleAcceptCollision?: (pairKey: string) => void;
}

export const GlobalDashboardView: React.FC<GlobalDashboardViewProps> = ({
  allTasks,
  allBoards,
  allTags,
  acceptedCollisions = [],
  onSelectTask,
  onResolveCollision,
  onToggleAcceptCollision,
}) => {
  const [filterMode, setFilterMode] = useState<'pending' | 'accepted' | 'all' | 'inter_only'>('pending');
  const [deliveryTab, setDeliveryTab] = useState<'this_week' | 'next_week' | 'this_month' | 'overdue'>('this_week');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);
  const [resolvedMessage, setResolvedMessage] = useState<string | null>(null);

  const getBoard = (boardId: string): Board => {
    return (
      allBoards.find((b) => b.id === boardId) || {
        id: boardId || 'default',
        name: 'General',
        color: '#64748b',
        createdAt: '',
      }
    );
  };

  const activeTasks = allTasks.filter((t) => t.status !== 'done');

  // Compute collisions using event-aware business rules:
  // Non-events can run in parallel without collision.
  // Collisions are detected if at least one item is an 'evento'.
  const allCollisions = detectCollisions(allTasks, allBoards, acceptedCollisions);
  const pendingCollisions = allCollisions.filter((c) => !c.isAccepted);
  const acceptedList = allCollisions.filter((c) => c.isAccepted);

  // Filtered collisions
  const filteredCollisions = allCollisions.filter((col) => {
    // Status filter
    if (filterMode === 'pending' && col.isAccepted) return false;
    if (filterMode === 'accepted' && !col.isAccepted) return false;
    if (filterMode === 'inter_only' && !col.isInterBoard) return false;

    // Board filter
    if (boardFilter !== 'all') {
      const matchA = col.taskA.boardId === boardFilter;
      const matchB = col.taskB.boardId === boardFilter;
      if (!matchA && !matchB) return false;
    }

    return true;
  });

  // Cross-board KPIs and Weekly / Monthly Ranges
  const now = new Date();
  const nowMs = now.getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // Monday to Sunday for This Week
  const dayOfWeek = (now.getDay() + 6) % 7;
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
  const endOfThisWeek = new Date(startOfThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // Monday to Sunday for Next Week
  const startOfNextWeek = new Date(endOfThisWeek.getTime() + 1);
  const endOfNextWeek = new Date(startOfNextWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  // This Month
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const dueTodayTasks = activeTasks.filter((t) => {
    const end = new Date(t.endDate).getTime();
    return end >= today.getTime() && end <= endOfToday.getTime();
  });

  const overdueTasks = activeTasks.filter((t) => {
    return new Date(t.endDate).getTime() < nowMs;
  });

  const tasksThisWeek = activeTasks.filter((t) => {
    const end = new Date(t.endDate).getTime();
    return end >= startOfThisWeek.getTime() && end <= endOfThisWeek.getTime();
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const tasksNextWeek = activeTasks.filter((t) => {
    const end = new Date(t.endDate).getTime();
    return end >= startOfNextWeek.getTime() && end <= endOfNextWeek.getTime();
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const tasksThisMonth = activeTasks.filter((t) => {
    const end = new Date(t.endDate).getTime();
    return end >= startOfThisMonth.getTime() && end <= endOfThisMonth.getTime();
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const totalEvents = activeTasks.filter((t) => isEventType(t)).length;

  const formatOverlapDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remHours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins} min`;
  };

  const handleAutoResolve = (col: TaskCollision) => {
    if (!onResolveCollision) return;

    // Shift Task B so it starts right after Task A ends
    const endAMs = new Date(col.taskA.endDate).getTime();
    const startBMs = new Date(col.taskB.startDate).getTime();
    const endBMs = new Date(col.taskB.endDate).getTime();
    const durationBMs = Math.max(1000 * 60 * 30, endBMs - startBMs);

    const newStartB = new Date(endAMs + 1000 * 60 * 15); // +15 min buffer
    const newEndB = new Date(newStartB.getTime() + durationBMs);

    onResolveCollision(col.taskB.id, newStartB.toISOString(), newEndB.toISOString());

    setResolvedMessage(
      `✓ Conflicto reprogramado: "${col.taskB.title}" iniciará automáticamente tras finalizar "${col.taskA.title}".`
    );
    setTimeout(() => setResolvedMessage(null), 5000);
  };

  const handleToggleAccept = (pairKey: string) => {
    if (onToggleAcceptCollision) {
      onToggleAcceptCollision(pairKey);
      const wasAccepted = acceptedCollisions.includes(pairKey);
      setResolvedMessage(
        wasAccepted
          ? 'ℹ️ Aceptación revertida: La colisión vuelve a estar activa.'
          : '✓ Colisión de evento aceptada: Se ha registrado la superposición horaria.'
      );
      setTimeout(() => setResolvedMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top minimalistic container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">Panel de Colisiones y Cruces Horarios</h2>
            <p className="text-xs text-slate-500">Monitoreo de solapamientos entre eventos y tareas en todos tus tableros</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Pendientes</span>
            <span className={`text-sm font-black ${pendingCollisions.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pendingCollisions.length}
            </span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Aceptadas</span>
            <span className="text-sm font-black text-indigo-600">{acceptedList.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Eventos</span>
            <span className="text-sm font-black text-purple-600">{totalEvents}</span>
          </div>
        </div>
      </div>

      {/* Floating alert toast */}
      {resolvedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <span>{resolvedMessage}</span>
          <button
            type="button"
            onClick={() => setResolvedMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cross-board Activity Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Activas Totales</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">{activeTasks.length}</p>
          <span className="text-[10px] text-slate-400 font-medium">En todos los tableros</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Para Hoy</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-900 mt-1">{dueTodayTasks.length}</p>
          <span className="text-[10px] text-amber-600/80 font-medium">Vencen antes de medianoche</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Vencidas</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-900 mt-1">{overdueTasks.length}</p>
          <span className="text-[10px] text-rose-600/80 font-medium">Semáforo negro</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase">Eventos Clave</span>
            <CalendarClock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-900 mt-1">{totalEvents}</p>
          <span className="text-[10px] text-purple-600/80 font-medium">Sincrónicos y estrictos</span>
        </div>
      </div>

      {/* Dashboard Section: Clasificación por Semanas y Mes */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Planificación por Semanas y Mes</h3>
              <p className="text-xs text-slate-500">
                Tareas clasificadas automáticamente según la cercanía de su fecha de entrega
              </p>
            </div>
          </div>

          {/* Delivery Range Tab Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'this_week', label: 'Esta Semana', count: tasksThisWeek.length },
              { id: 'next_week', label: 'Próxima Semana', count: tasksNextWeek.length },
              { id: 'this_month', label: 'Este Mes', count: tasksThisMonth.length },
              { id: 'overdue', label: 'Vencidas', count: overdueTasks.length, alert: true },
            ].map((t) => {
              const isSel = deliveryTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDeliveryTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSel
                      ? t.alert
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : t.alert && t.count > 0
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSel
                        ? 'bg-white/20 text-white'
                        : t.alert && t.count > 0
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Cards Grid for Active Tab */}
        {(() => {
          const currentList =
            deliveryTab === 'this_week'
              ? tasksThisWeek
              : deliveryTab === 'next_week'
              ? tasksNextWeek
              : deliveryTab === 'this_month'
              ? tasksThisMonth
              : overdueTasks;

          if (currentList.length === 0) {
            return (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  {deliveryTab === 'overdue'
                    ? '¡Excelente! No tienes ninguna tarea vencida.'
                    : 'No hay tareas con entrega en este periodo.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Las tareas se ordenan dinámicamente según la fecha de finalización más cercana.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {currentList.map((t) => {
                const tBoard = getBoard(t.boardId);
                const timeCalc = calculateTimeLevel(t.startDate, t.endDate, nowMs, t.status === 'done');

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs truncate max-w-[130px]"
                          style={{ backgroundColor: tBoard.color }}
                        >
                          {tBoard.name}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${timeCalc.badgeBg}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              timeCalc.isOverdue && t.status !== 'done'
                                ? 'bg-amber-400 animate-ping'
                                : timeCalc.level === 'red'
                                ? 'bg-rose-500'
                                : 'bg-current'
                            }`}
                          />
                          {timeCalc.remainingText}
                        </span>
                      </div>

                      {/* Full title without truncation */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors break-words leading-snug">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 break-words">
                          {t.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(t.endDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <span className="capitalize font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Collision Filters and Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filterMode === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Pendientes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterMode === 'pending' ? 'bg-slate-950 text-amber-300 font-black' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingCollisions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('accepted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filterMode === 'accepted'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aceptadas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterMode === 'accepted' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {acceptedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <span>Todas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterMode === 'all' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {allCollisions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('inter_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filterMode === 'inter_only'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Entre Tableros</span>
          </button>
        </div>

        {/* Board Custom Modal Filter */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => setIsBoardPickerOpen(true)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-800 font-semibold cursor-pointer flex items-center justify-between gap-2 shadow-2xs transition-colors"
          >
            <span>{boardFilter === 'all' ? 'Todos los tableros' : getBoard(boardFilter).name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Collision Cards List */}
      <div className="space-y-3">
        {filteredCollisions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {filterMode === 'pending'
                  ? '¡Sin colisiones de agenda pendientes!'
                  : filterMode === 'accepted'
                  ? 'No hay colisiones aceptadas'
                  : 'No se detectaron colisiones de eventos'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                {filterMode === 'pending'
                  ? 'Todos tus eventos tienen horarios libres o ya has aceptado las superposiciones programadas. Las tareas en paralelo continúan sin interferencias.'
                  : 'Usa esta vista para monitorear solapamientos de horario entre eventos sincrónicos.'}
              </p>
            </div>
          </div>
        ) : (
          filteredCollisions.map((col) => {
            const isEventA = isEventType(col.taskA);
            const isEventB = isEventType(col.taskB);
            const isBothEvents = isEventA && isEventB;
            const boardA = col.boardA || getBoard(col.taskA.boardId);
            const boardB = col.boardB || getBoard(col.taskB.boardId);

            return (
              <div
                key={col.id}
                className={`p-4 rounded-2xl border transition-all shadow-2xs ${
                  col.isAccepted
                    ? 'bg-slate-50/70 border-slate-200 opacity-90'
                    : isBothEvents
                    ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                    : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                }`}
              >
                {/* Header: Collision Nature & Overlap Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    {col.isAccepted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Colisión Aceptada / Permitida
                      </span>
                    ) : isBothEvents ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-600" /> Choque de 2 Eventos Sincrónicos
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3 text-amber-700" /> Evento vs Tarea/Actividad
                      </span>
                    )}

                    {col.isInterBoard ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        ⚡ Entre 2 Tableros distintos
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        En el mismo tablero ({boardA.name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Solapamiento:</span>
                    <span className="text-rose-600 font-extrabold">{formatOverlapDuration(col.overlapMinutes)}</span>
                  </div>
                </div>

                {/* Explicit Collision breakdown: Task A colliding with Task B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
                  {/* Task / Event A */}
                  <div
                    onClick={() => onSelectTask(col.taskA)}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs group relative"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: boardA.color }}
                        />
                        <span className="text-[11px] font-extrabold text-slate-700 truncate">
                          Tablero: {boardA.name}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isEventA
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {col.taskA.type || 'Tarea'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {col.taskA.title}
                    </h4>

                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(col.taskA.startDate).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          →{' '}
                          {new Date(col.taskA.endDate).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Task / Event B */}
                  <div
                    onClick={() => onSelectTask(col.taskB)}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs group relative"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: boardB.color }}
                        />
                        <span className="text-[11px] font-extrabold text-slate-700 truncate">
                          Tablero: {boardB.name}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isEventB
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {col.taskB.type || 'Tarea'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {col.taskB.title}
                    </h4>

                    <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(col.taskB.startDate).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          →{' '}
                          {new Date(col.taskB.endDate).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlap Summary & Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600 font-medium">
                    <span>
                      Franja en colisión:{' '}
                      <strong className="text-slate-800">
                        {col.overlapStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} a{' '}
                        {col.overlapEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </strong>{' '}
                      ({col.overlapStart.toLocaleDateString()})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Accept Collision button */}
                    <button
                      type="button"
                      onClick={() => handleToggleAccept(col.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        col.isAccepted
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={
                        col.isAccepted
                          ? 'Revertir aceptación de colisión'
                          : 'Aceptar que este evento y tarea/evento se ejecuten simultáneamente'
                      }
                    >
                      {col.isAccepted ? (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Revertir Aceptación</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Aceptar Colisión</span>
                        </>
                      )}
                    </button>

                    {/* Auto-Resolve button */}
                    <button
                      type="button"
                      onClick={() => handleAutoResolve(col)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Reprograma la segunda tarea para iniciar 15 minutos después de la primera"
                    >
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Reprogramar Auto</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Educational Notice about Parallel Tasks */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Ejecución en Paralelo Permitida
        </h4>
        <p className="leading-relaxed">
          Las actividades de tipo <strong>Tarea, Función, Mantenimiento, Investigación e Hito</strong> están diseñadas para poder desarrollarse simultáneamente sin provocar alertas intrusivas. Las alertas de conflicto se reservan exclusivamente para <strong>Eventos sincrónicos</strong> (o cuando un evento coincide con cualquier otra actividad).
        </p>
      </div>

      {/* Board Filter OptionPickerModal */}
      <OptionPickerModal
        isOpen={isBoardPickerOpen}
        title="Filtrar por Tablero"
        subtitle="Selecciona el tablero para auditar colisiones"
        icon={Filter}
        options={[
          { id: 'all', label: 'Todos los tableros' },
          ...allBoards.map((b) => ({
            id: b.id,
            label: b.name,
            color: b.color,
          })),
        ]}
        selectedValue={boardFilter}
        onSelect={(val) => setBoardFilter(val)}
        onClose={() => setIsBoardPickerOpen(false)}
      />
    </div>
  );
};
