import React, { useState } from 'react';
import { TaskItem } from '../types';
import { calculateComplianceMetrics, exportTasksToExcel, printCompliancePDF } from '../services/reports';
import { calculateTimeLevel } from '../utils/timeColor';
import {
  X,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
  XCircle,
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  tasks: TaskItem[];
  onClose: () => void;
  onSelectTask?: (task: TaskItem) => void;
}

type DrilldownCategory =
  | 'all'
  | 'compliance'
  | 'completed'
  | 'completed_ontime'
  | 'completed_late'
  | 'overdue'
  | 'pending_ontime'
  | 'out_of_deadline'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'black';

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  tasks,
  onClose,
  onSelectTask,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DrilldownCategory | null>(null);
  const [completedFilter, setCompletedFilter] = useState<'all' | 'ontime' | 'late'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const metrics = calculateComplianceMetrics(tasks);

  // Calculate breakdown by color level
  const colorCounts = {
    green: 0,
    blue: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    black: 0,
  };

  const now = Date.now();

  tasks.forEach((t) => {
    const calc = calculateTimeLevel(t.startDate, t.endDate, now, t.status === 'done');
    colorCounts[calc.level]++;
  });

  // Filter tasks for drilldown
  const getDrilldownTasks = (): { title: string; tasks: TaskItem[]; subtitle?: string } => {
    if (!selectedCategory) return { title: '', tasks: [] };

    switch (selectedCategory) {
      case 'all':
        return {
          title: 'Todas las Tareas',
          subtitle: 'Listado completo de tareas evaluadas',
          tasks,
        };
      case 'compliance': {
        const evalTasks = tasks.filter((t) => {
          if (t.status === 'done') return true;
          const end = new Date(t.endDate).getTime();
          return now > end;
        });
        return {
          title: 'Tareas Evaluadas para Cumplimiento',
          subtitle: `${metrics.completedOnTime} a tiempo de ${metrics.completedTasks + metrics.overdueTasks} evaluadas`,
          tasks: evalTasks,
        };
      }
      case 'completed': {
        const doneTasks = tasks.filter((t) => t.status === 'done' && t.completionOutcome !== 'missed');
        let filtered = doneTasks;
        if (completedFilter === 'ontime') {
          filtered = doneTasks.filter((t) => {
            const end = new Date(t.endDate).getTime();
            const comp = t.completedAt ? new Date(t.completedAt).getTime() : now;
            return comp <= end;
          });
        } else if (completedFilter === 'late') {
          filtered = doneTasks.filter((t) => {
            const end = new Date(t.endDate).getTime();
            const comp = t.completedAt ? new Date(t.completedAt).getTime() : now;
            return comp > end;
          });
        }
        return {
          title: 'Tareas Completadas (Cumplidas)',
          subtitle: `${metrics.completedTasks} completadas (${metrics.completedOnTime} a tiempo • ${metrics.completedLate} a destiempo)`,
          tasks: filtered,
        };
      }
      case 'overdue': {
        const overdue = tasks.filter((t) => {
          if (t.status === 'done') {
            return t.completionOutcome === 'missed';
          }
          return now > new Date(t.endDate).getTime();
        });
        const unfulfilledCount = tasks.filter((t) => t.status === 'done' && t.completionOutcome === 'missed').length;
        return {
          title: 'Tareas Vencidas / No Cumplidas',
          subtitle: `${metrics.overdueTasks} tareas (${unfulfilledCount > 0 ? `${unfulfilledCount} cerradas sin ejecutar + ` : ''}${metrics.overdueTasks - unfulfilledCount} activas fuera de plazo)`,
          tasks: overdue,
        };
      }
      case 'pending_ontime': {
        const pendingOnTimeTasks = tasks.filter((t) => {
          if (t.status === 'done') {
            const end = new Date(t.endDate).getTime();
            const comp = t.completedAt ? new Date(t.completedAt).getTime() : now;
            return comp <= end;
          }
          return now <= new Date(t.endDate).getTime();
        });
        return {
          title: 'Tareas en Tiempo de Cumplimiento',
          subtitle: 'Tareas activas dentro del plazo o completadas a tiempo',
          tasks: pendingOnTimeTasks,
        };
      }
      case 'out_of_deadline': {
        const outOfDeadlineTasks = tasks.filter((t) => {
          if (t.status === 'done') {
            const end = new Date(t.endDate).getTime();
            const comp = t.completedAt ? new Date(t.completedAt).getTime() : now;
            return comp > end;
          }
          return now > new Date(t.endDate).getTime();
        });
        return {
          title: 'Tareas Fuera de Plazo',
          subtitle: `${metrics.completedLate} completadas con retraso + ${metrics.overdueTasks} vencidas activas`,
          tasks: outOfDeadlineTasks,
        };
      }
      case 'green':
      case 'blue':
      case 'yellow':
      case 'orange':
      case 'red':
      case 'black': {
        const colorLabels: Record<string, string> = {
          green: 'Semáforo Verde (0-24% consumido)',
          blue: 'Semáforo Azul (25-49% consumido)',
          yellow: 'Semáforo Amarillo (50-74% consumido)',
          orange: 'Semáforo Naranja (75-89% consumido)',
          red: 'Semáforo Rojo (90-99% consumido)',
          black: 'Semáforo Negro (100%+ Vencida)',
        };
        const matching = tasks.filter((t) => {
          const calc = calculateTimeLevel(t.startDate, t.endDate, now, t.status === 'done');
          return calc.level === selectedCategory;
        });
        return {
          title: colorLabels[selectedCategory],
          subtitle: `Tareas en el rango de tiempo ${selectedCategory.toUpperCase()}`,
          tasks: matching,
        };
      }
      default:
        return { title: 'Tareas', tasks: [] };
    }
  };

  const drilldownData = selectedCategory ? getDrilldownTasks() : null;

  const filteredDrilldownTasks = drilldownData
    ? drilldownData.tasks.filter((t) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.priority.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
        );
      })
    : [];

  const handleTaskClick = (task: TaskItem) => {
    if (onSelectTask) {
      onSelectTask(task);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchFilter('');
                  setCompletedFilter('all');
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Volver al resumen de métricas"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            ) : (
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {selectedCategory ? drilldownData?.title : 'Reporte Ejecutivo de Cumplimiento y Plazos'}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedCategory
                  ? drilldownData?.subtitle
                  : 'Métricas de desempeño, tareas a tiempo y auditoría de vencimientos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedCategory && (
              <>
                <button
                  type="button"
                  onClick={() => exportTasksToExcel(tasks)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Descargar reporte en formato Excel CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => printCompliancePDF(tasks)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Imprimir informe oficial o guardar en PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  PDF
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {selectedCategory ? (
            /* =================== DRILLDOWN VIEW =================== */
            <div className="space-y-4">
              {/* Category-specific controls (for completed tasks: Todas / A tiempo / A destiempo) */}
              {selectedCategory === 'completed' && (
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setCompletedFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      completedFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todas ({metrics.completedTasks})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletedFilter('ontime')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      completedFilter === 'ontime'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    A tiempo ({metrics.completedOnTime})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletedFilter('late')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      completedFilter === 'late'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    A destiempo ({metrics.completedLate})
                  </button>
                </div>
              )}

              {/* Search Bar within drilldown */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar tarea por título, prioridad o tipo..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Task Cards List */}
              {filteredDrilldownTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-bold text-slate-600">No hay tareas en este criterio</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prueba cambiando el filtro o la búsqueda.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                    <span>MOSTRANDO {filteredDrilldownTasks.length} TAREAS</span>
                    {onSelectTask && <span>Haz clic en una tarea para abrirla</span>}
                  </div>

                  {filteredDrilldownTasks.map((task, idx) => {
                    const isDone = task.status === 'done';
                    const isMissed = isDone && task.completionOutcome === 'missed';
                    const timeCalc = calculateTimeLevel(task.startDate, task.endDate, now, isDone);
                    const endMs = new Date(task.endDate).getTime();
                    const completedMs = task.completedAt ? new Date(task.completedAt).getTime() : now;
                    const wasCompletedOnTime = isDone && !isMissed && completedMs <= endMs;
                    const wasCompletedLate = isDone && !isMissed && completedMs > endMs;

                    return (
                      <div
                        key={`${task.id}-${idx}`}
                        onClick={() => handleTaskClick(task)}
                        className={`p-3.5 rounded-xl border transition-all text-left group ${
                          onSelectTask ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''
                        } ${
                          isMissed
                            ? 'bg-rose-50/70 border-rose-300'
                            : isDone
                            ? wasCompletedOnTime
                              ? 'bg-emerald-50/40 border-emerald-200/70'
                              : 'bg-amber-50/50 border-amber-200/80'
                            : timeCalc.isOverdue
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  isMissed
                                    ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                    : task.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : task.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : task.status === 'waiting'
                                    ? 'bg-purple-100 text-purple-800'
                                    : task.status === 'in_review'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {isMissed
                                  ? 'No Cumplida'
                                  : task.status === 'done'
                                  ? 'Completada'
                                  : task.status === 'in_progress'
                                  ? 'En Progreso'
                                  : task.status === 'waiting'
                                  ? 'En Espera'
                                  : task.status === 'in_review'
                                  ? 'En Revisión'
                                  : 'Por Hacer'}
                              </span>

                              {isMissed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-900 text-rose-300 shadow-2xs">
                                  <XCircle className="w-3 h-3" />
                                  Vencida sin Ejecutar
                                </span>
                              )}

                              {isDone && !isMissed && wasCompletedOnTime && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                                  <CheckCircle className="w-3 h-3" />
                                  A Tiempo
                                </span>
                              )}

                              {isDone && !isMissed && wasCompletedLate && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-2xs">
                                  <AlertTriangle className="w-3 h-3" />
                                  A Destiempo (Fuera de Plazo)
                                </span>
                              )}

                              {!isDone && timeCalc.isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-900 text-amber-300">
                                  <AlertCircle className="w-3 h-3" />
                                  Vencida
                                </span>
                              )}

                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">
                                {task.priority}
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}

                            {/* Dates details */}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="text-slate-400 font-medium">Inicio:</span>
                                <span className="font-semibold text-slate-700">
                                  {new Date(task.startDate).toLocaleDateString()}
                                </span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="text-slate-400 font-medium">Límite:</span>
                                <span className="font-semibold text-slate-700">
                                  {new Date(task.endDate).toLocaleDateString()} {new Date(task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </span>

                              {isDone && task.completedAt && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <span className="text-slate-400 font-medium">Completada el:</span>
                                    <span
                                      className={`font-semibold ${
                                        wasCompletedOnTime ? 'text-emerald-700' : 'text-amber-800'
                                      }`}
                                    >
                                      {new Date(task.completedAt).toLocaleDateString()} {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                timeCalc.level === 'green'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : timeCalc.level === 'blue'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : timeCalc.level === 'yellow'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                  : timeCalc.level === 'orange'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : timeCalc.level === 'red'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-stone-900 text-amber-300 border border-stone-800'
                              }`}
                            >
                              {timeCalc.label}
                            </span>

                            {onSelectTask && (
                              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform mt-2">
                                Abrir <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =================== MAIN METRICS OVERVIEW =================== */
            <>
              {/* Click instruction banner */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-blue-900 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Haz clic en cualquiera de las tarjetas para ver el listado detallado de tareas.
                </span>
                <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  Interactivo
                </span>
              </div>

              {/* Main KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Total Tareas */}
                <div
                  onClick={() => setSelectedCategory('all')}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 transition-all text-center cursor-pointer group shadow-2xs hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  title="Ver todas las tareas"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-black text-slate-900 group-hover:scale-105 transition-transform">
                      {metrics.totalTasks}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase mt-1">Total Tareas</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ver lista completa</p>
                </div>

                {/* Tasa Cumplimiento */}
                <div
                  onClick={() => setSelectedCategory('compliance')}
                  className="p-4 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 hover:border-emerald-300 transition-all text-center cursor-pointer group shadow-2xs hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  title="Ver tareas evaluadas para cumplimiento"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-black text-emerald-700 group-hover:scale-105 transition-transform">
                      {metrics.complianceRate}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase mt-1">Tasa Cumplimiento</p>
                  <p className="text-[10px] text-emerald-600 mt-1">{metrics.completedOnTime} a tiempo de {metrics.completedTasks + metrics.overdueTasks}</p>
                </div>

                {/* Completadas (highlighting completed on time and completed late) */}
                <div
                  onClick={() => {
                    setSelectedCategory('completed');
                    setCompletedFilter('all');
                  }}
                  className="p-4 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200 hover:border-sky-300 transition-all text-center cursor-pointer group shadow-2xs hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  title="Ver tareas completadas (a tiempo y a destiempo)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-black text-sky-700 group-hover:scale-105 transition-transform">
                      {metrics.completedTasks}
                    </span>
                    <ChevronRight className="w-4 h-4 text-sky-500 group-hover:text-sky-800 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] font-bold text-sky-800 uppercase mt-1">Completadas</p>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-semibold mt-1 flex-wrap">
                    <span className="text-emerald-700 font-bold">{metrics.completedOnTime} a tiempo</span>
                    <span className="text-slate-300">•</span>
                    <span className={`font-bold ${metrics.completedLate > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {metrics.completedLate} a destiempo
                    </span>
                  </div>
                </div>

                {/* Vencidas (Nivel Negro) */}
                <div
                  onClick={() => setSelectedCategory('overdue')}
                  className="p-4 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 hover:border-rose-300 transition-all text-center cursor-pointer group shadow-2xs hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  title="Ver tareas vencidas activas"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-black text-rose-700 group-hover:scale-105 transition-transform">
                      {metrics.overdueTasks}
                    </span>
                    <ChevronRight className="w-4 h-4 text-rose-500 group-hover:text-rose-800 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] font-bold text-rose-800 uppercase mt-1">
                    Vencidas (Nivel Negro)
                  </p>
                  <p className="text-[10px] text-rose-600 mt-1">Plazo vencido</p>
                </div>
              </div>

              {/* Compliance Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Rendimiento Global de Entrega a Tiempo</span>
                  <span className="text-blue-600 font-bold">{metrics.complianceRate}% Efectividad</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${metrics.complianceRate}%` }}
                    title={`A tiempo: ${metrics.complianceRate}%`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${100 - metrics.complianceRate}%` }}
                    title={`Con retraso / vencidas: ${100 - metrics.complianceRate}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('pending_ontime')}
                    className="flex items-center gap-1 text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {metrics.completedOnTime + metrics.pendingOnTime} tareas en tiempo
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('out_of_deadline')}
                    className="flex items-center gap-1 text-rose-700 font-semibold hover:underline cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {metrics.overdueTasks + metrics.completedLate} tareas fuera de plazo
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Semáforo Distribution */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Distribución por Niveles de Semáforo
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Haz clic en cualquier nivel
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div
                    onClick={() => setSelectedCategory('green')}
                    className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/90 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Verde"
                  >
                    <span className="text-lg font-bold text-emerald-800">{colorCounts.green}</span>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Verde <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-emerald-600">0-24%</p>
                  </div>

                  <div
                    onClick={() => setSelectedCategory('blue')}
                    className="p-2.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100/90 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Azul"
                  >
                    <span className="text-lg font-bold text-sky-800">{colorCounts.blue}</span>
                    <p className="text-[10px] font-bold text-sky-700 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Azul <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-sky-600">25-49%</p>
                  </div>

                  <div
                    onClick={() => setSelectedCategory('yellow')}
                    className="p-2.5 rounded-lg border border-yellow-300 bg-yellow-50 hover:bg-yellow-100/90 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Amarillo"
                  >
                    <span className="text-lg font-bold text-yellow-800">{colorCounts.yellow}</span>
                    <p className="text-[10px] font-bold text-yellow-700 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Amarillo <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-yellow-700">50-74%</p>
                  </div>

                  <div
                    onClick={() => setSelectedCategory('orange')}
                    className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100/90 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Naranja"
                  >
                    <span className="text-lg font-bold text-amber-900">{colorCounts.orange}</span>
                    <p className="text-[10px] font-bold text-amber-800 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Naranja <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-amber-700">75-89%</p>
                  </div>

                  <div
                    onClick={() => setSelectedCategory('red')}
                    className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100/90 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Rojo"
                  >
                    <span className="text-lg font-bold text-rose-800">{colorCounts.red}</span>
                    <p className="text-[10px] font-bold text-rose-700 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Rojo <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-rose-600">90-99%</p>
                  </div>

                  <div
                    onClick={() => setSelectedCategory('black')}
                    className="p-2.5 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 text-center text-amber-200 cursor-pointer transition-all hover:scale-102 hover:shadow-xs group"
                    role="button"
                    tabIndex={0}
                    title="Ver tareas Nivel Negro (Vencidas)"
                  >
                    <span className="text-lg font-bold text-amber-200">{colorCounts.black}</span>
                    <p className="text-[10px] font-bold text-amber-300 uppercase mt-0.5 flex items-center justify-center gap-0.5">
                      Negro <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-[9px] text-amber-400">Vencida</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {selectedCategory ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchFilter('');
                }}
                className="text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al panel general
              </button>
            ) : (
              <span>Auditoría de cumplimiento en tiempo real</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
