import React, { useState, useMemo } from 'react';
import { TaskItem, CustomTag, TaskStatus, Board, CustomPriorityDefinition } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { formatRecurrenceLabel } from '../utils/recurrence';
import { sortTasksByPriorityAndUrgency, detectTaskStatusMismatch } from '../utils/prioritySort';
import { OptionPickerModal, PickerOption } from './OptionPickerModal';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Flag,
  Repeat,
  Paperclip,
  MessageSquare,
  Filter,
  Check,
  ChevronDown,
  X,
  Layers,
  Flame,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface TaskListViewProps {
  tasks: TaskItem[];
  allTags: CustomTag[];
  allBoards?: Board[];
  allPriorities?: CustomPriorityDefinition[];
  isMasterView?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

type DeliveryFilterType = 'all' | 'overdue' | 'this_week' | 'next_week' | 'this_month';

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  allTags,
  allBoards,
  allPriorities,
  isMasterView,
  onSelectTask,
  onStatusChange,
}) => {
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [semaforoFilter, setSemaforoFilter] = useState<string>('all');

  // Filter ranges computation
  const { startOfThisWeek, endOfThisWeek, startOfNextWeek, endOfNextWeek, startOfThisMonth, endOfThisMonth } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
    const endWeek = new Date(startWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const startNext = new Date(endWeek.getTime() + 1);
    const endNext = new Date(startNext.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      startOfThisWeek: startWeek.getTime(),
      endOfThisWeek: endWeek.getTime(),
      startOfNextWeek: startNext.getTime(),
      endOfNextWeek: endNext.getTime(),
      startOfThisMonth: startMonth.getTime(),
      endOfThisMonth: endMonth.getTime(),
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const nowMs = Date.now();

    return tasks.filter((task) => {
      const isDone = task.status === 'done';
      const endMs = new Date(task.endDate).getTime();
      const timeCalc = calculateTimeLevel(task.startDate, task.endDate, nowMs, isDone);

      // 1. Delivery range filter
      if (deliveryFilter === 'overdue') {
        if (isDone || endMs >= nowMs) return false;
      } else if (deliveryFilter === 'this_week') {
        if (endMs < startOfThisWeek || endMs > endOfThisWeek) return false;
      } else if (deliveryFilter === 'next_week') {
        if (endMs < startOfNextWeek || endMs > endOfNextWeek) return false;
      } else if (deliveryFilter === 'this_month') {
        if (endMs < startOfThisMonth || endMs > endOfThisMonth) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      // 3. Semáforo filter
      if (semaforoFilter !== 'all') {
        if (semaforoFilter === 'black' && !timeCalc.isOverdue) return false;
        if (semaforoFilter !== 'black' && timeCalc.level !== semaforoFilter) return false;
      }

      return true;
    });
  }, [
    tasks,
    deliveryFilter,
    statusFilter,
    semaforoFilter,
    startOfThisWeek,
    endOfThisWeek,
    startOfNextWeek,
    endOfNextWeek,
    startOfThisMonth,
    endOfThisMonth,
  ]);

  const sortedTasks = useMemo(() => {
    return sortTasksByPriorityAndUrgency(filteredTasks, allPriorities);
  }, [filteredTasks, allPriorities]);

  // Count tallies for quick badges
  const overdueCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => t.status !== 'done' && new Date(t.endDate).getTime() < now).length;
  }, [tasks]);

  const thisWeekCount = useMemo(() => {
    return tasks.filter((t) => {
      const end = new Date(t.endDate).getTime();
      return end >= startOfThisWeek && end <= endOfThisWeek;
    }).length;
  }, [tasks, startOfThisWeek, endOfThisWeek]);

  const nextWeekCount = useMemo(() => {
    return tasks.filter((t) => {
      const end = new Date(t.endDate).getTime();
      return end >= startOfNextWeek && end <= endOfNextWeek;
    }).length;
  }, [tasks, startOfNextWeek, endOfNextWeek]);

  const thisMonthCount = useMemo(() => {
    return tasks.filter((t) => {
      const end = new Date(t.endDate).getTime();
      return end >= startOfThisMonth && end <= endOfThisMonth;
    }).length;
  }, [tasks, startOfThisMonth, endOfThisMonth]);

  const [activePickerModal, setActivePickerModal] = useState<'delivery' | 'status' | 'semaforo' | null>(null);

  const hasActiveFilters = deliveryFilter !== 'all' || statusFilter !== 'all' || semaforoFilter !== 'all';

  const deliveryOptions: PickerOption[] = [
    { id: 'all', label: `Todas las Entregas (${tasks.length})`, description: 'Mostrar todas las tareas sin restricciones' },
    { id: 'overdue', label: `🚨 Vencidas (${overdueCount})`, description: 'Tareas cuya fecha fin ya transcurrió' },
    { id: 'this_week', label: `📌 Esta Semana (${thisWeekCount})`, description: 'Entregas programadas para esta semana' },
    { id: 'next_week', label: `🗓️ Próxima Semana (${nextWeekCount})`, description: 'Entregas programadas para la siguiente semana' },
    { id: 'this_month', label: `📆 Este Mes (${thisMonthCount})`, description: 'Entregas programadas para este mes' },
  ];

  const statusOptions: PickerOption[] = [
    { id: 'all', label: 'Todos los Estados', description: 'Por Hacer, En Progreso, En Espera, En Revisión y Completadas' },
    { id: 'todo', label: 'Por Hacer', description: 'Tareas pendientes por iniciar' },
    { id: 'in_progress', label: 'En Progreso', description: 'Tareas activas en desarrollo' },
    { id: 'waiting', label: 'En Espera (4d)', description: 'Pausadas o esperando insumos' },
    { id: 'in_review', label: 'En Revisión', description: 'Pendientes de aprobación' },
    { id: 'done', label: 'Completadas', description: 'Tareas finalizadas' },
  ];

  const semaforoOptions: PickerOption[] = [
    { id: 'all', label: 'Todos los Semáforos', description: 'Verde, Azul, Amarillo, Naranja, Rojo y Negro' },
    { id: 'green', label: '🟢 Verde (>50%)', description: 'Tiempo holgado restante' },
    { id: 'blue', label: '🔵 Azul (25-50%)', description: 'Avance normal' },
    { id: 'yellow', label: '🟡 Amarillo (10-25%)', description: 'Atención recomendada' },
    { id: 'orange', label: '🟠 Naranja (<10%)', description: 'Próxima a vencer' },
    { id: 'red', label: '🔴 Rojo (Crítico)', description: 'Urgencia máxima' },
    { id: 'black', label: '⚫ Negro (Vencidas)', description: 'Fecha de entrega superada' },
  ];

  return (
    <div className="space-y-3">
      {/* Top Filter Bar with Touch/Mobile Modal Triggers */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1 sm:gap-2 w-full">
        {/* 1. Entrega Modal Trigger */}
        <button
          type="button"
          onClick={() => setActivePickerModal('delivery')}
          className="flex-1 min-w-0 flex items-center justify-between gap-1 px-2 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
              {deliveryFilter === 'all'
                ? `Entrega (${tasks.length})`
                : deliveryFilter === 'overdue'
                ? `🚨 Vencidas (${overdueCount})`
                : deliveryFilter === 'this_week'
                ? `📌 Esta Sem. (${thisWeekCount})`
                : deliveryFilter === 'next_week'
                ? `🗓️ Próx. Sem. (${nextWeekCount})`
                : `📆 Este Mes (${thisMonthCount})`}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* 2. Estado Modal Trigger */}
        <button
          type="button"
          onClick={() => setActivePickerModal('status')}
          className="flex-1 min-w-0 flex items-center justify-between gap-1 px-2 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
              {statusFilter === 'all'
                ? 'Estado: Todos'
                : statusFilter === 'todo'
                ? 'Por Hacer'
                : statusFilter === 'in_progress'
                ? 'En Progreso'
                : statusFilter === 'waiting'
                ? 'En Espera'
                : statusFilter === 'in_review'
                ? 'En Revisión'
                : 'Completada'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* 3. Semáforo Modal Trigger */}
        <button
          type="button"
          onClick={() => setActivePickerModal('semaforo')}
          className="flex-1 min-w-0 flex items-center justify-between gap-1 px-2 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
              {semaforoFilter === 'all'
                ? 'Semáforo: Todos'
                : semaforoFilter === 'green'
                ? '🟢 Verde'
                : semaforoFilter === 'blue'
                ? '🔵 Azul'
                : semaforoFilter === 'yellow'
                ? '🟡 Amarillo'
                : semaforoFilter === 'orange'
                ? '🟠 Naranja'
                : semaforoFilter === 'red'
                ? '🔴 Rojo'
                : '⚫ Negro'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* Clear Filters Button (compact inline) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setDeliveryFilter('all');
              setStatusFilter('all');
              setSemaforoFilter('all');
            }}
            className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
            title="Restablecer filtros"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 whitespace-nowrap">Semáforo de Tiempo</th>
                <th className="py-3 px-4 min-w-[300px] sm:min-w-[360px]">Nombre Completo de la Tarea</th>
                {isMasterView && <th className="py-3 px-4 whitespace-nowrap">Tablero</th>}
                <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 whitespace-nowrap">Prioridad</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipo</th>
                <th className="py-3 px-4 whitespace-nowrap">Fecha Fin (Límite)</th>
                <th className="py-3 px-4 whitespace-nowrap">Periodicidad</th>
                <th className="py-3 px-4">Etiquetas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={isMasterView ? 10 : 9} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No se encontraron tareas con los filtros seleccionados.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Prueba cambiando el rango de entrega o el estado.</p>
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => {
                  const isDone = task.status === 'done';
                  const timeCalc = calculateTimeLevel(task.startDate, task.endDate, Date.now(), isDone);
                  const mismatch = detectTaskStatusMismatch(task, Date.now());
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

                      {/* 1. Semáforo de Tiempo FIRST */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border text-[11px] ${timeCalc.badgeBg}`}
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

                      {/* 2. Full Task Name */}
                      <td className="py-3 px-4 min-w-[300px] sm:min-w-[360px]">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm break-words whitespace-normal leading-relaxed">
                          {task.title}
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 break-words whitespace-normal leading-relaxed line-clamp-2">
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

                      {isMasterView && (
                        <td className="py-3 px-4 whitespace-nowrap">
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

                      {/* Status Column with Detector */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded-md font-medium capitalize bg-slate-100 text-slate-700">
                            {task.status.replace('_', ' ')}
                          </span>
                          {mismatch.isMismatched && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(task.id, mismatch.suggestedStatus);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${mismatch.badgeColor}`}
                              title={`${mismatch.reason} Click para mover a ${mismatch.suggestedStatusLabel}.`}
                            >
                              <Zap className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                              <span>Sugerido: En Progreso</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize font-semibold text-slate-700 flex items-center gap-1">
                          <Flag className="w-3 h-3 text-slate-400" />
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap capitalize text-slate-600">{task.type}</td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {new Date(task.endDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
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

      {/* Option Picker Modals for Filter Selections */}
      <OptionPickerModal
        isOpen={activePickerModal === 'delivery'}
        title="Filtrar por Entrega"
        subtitle="Muestra tareas según la cercanía o estado de entrega"
        icon={Calendar}
        options={deliveryOptions}
        selectedValue={deliveryFilter}
        onSelect={(id: any) => setDeliveryFilter(id as DeliveryFilterType)}
        onClose={() => setActivePickerModal(null)}
      />

      <OptionPickerModal
        isOpen={activePickerModal === 'status'}
        title="Filtrar por Estado"
        subtitle="Muestra tareas según la etapa de avance actual"
        icon={CheckCircle2}
        options={statusOptions}
        selectedValue={statusFilter}
        onSelect={(id: any) => setStatusFilter(String(id))}
        onClose={() => setActivePickerModal(null)}
      />

      <OptionPickerModal
        isOpen={activePickerModal === 'semaforo'}
        title="Filtrar por Semáforo de Tiempo"
        subtitle="Muestra tareas según el porcentaje de tiempo transcurrido o urgencia"
        icon={Clock}
        options={semaforoOptions}
        selectedValue={semaforoFilter}
        onSelect={(id: any) => setSemaforoFilter(String(id))}
        onClose={() => setActivePickerModal(null)}
      />
    </div>
  );
};
