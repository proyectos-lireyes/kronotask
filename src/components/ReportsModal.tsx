import React from 'react';
import { TaskItem } from '../types';
import { calculateComplianceMetrics, exportTasksToExcel, printCompliancePDF } from '../services/reports';
import { calculateTimeLevel } from '../utils/timeColor';
import { X, FileSpreadsheet, Printer, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  tasks: TaskItem[];
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  tasks,
  onClose,
}) => {
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

  tasks.forEach((t) => {
    const calc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), t.status === 'done');
    colorCounts[calc.level]++;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reporte Ejecutivo de Cumplimiento y Plazos
              </h2>
              <p className="text-xs text-slate-500">
                Métricas de desempeño, tareas a tiempo y auditoría de vencimientos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(80vh-140px)] overflow-y-auto">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-2xl font-black text-slate-900">{metrics.totalTasks}</span>
              <p className="text-[11px] font-bold text-slate-500 uppercase mt-1">Total Tareas</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
              <span className="text-2xl font-black text-emerald-700">
                {metrics.complianceRate}%
              </span>
              <p className="text-[11px] font-bold text-emerald-800 uppercase mt-1">Tasa Cumplimiento</p>
            </div>

            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-center">
              <span className="text-2xl font-black text-sky-700">{metrics.completedTasks}</span>
              <p className="text-[11px] font-bold text-sky-800 uppercase mt-1">
                Completadas ({metrics.completedOnTime} a tiempo)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
              <span className="text-2xl font-black text-rose-700">{metrics.overdueTasks}</span>
              <p className="text-[11px] font-bold text-rose-800 uppercase mt-1">
                Vencidas (Nivel Negro)
              </p>
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
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {metrics.completedOnTime + metrics.pendingOnTime} tareas en tiempo
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {metrics.overdueTasks + metrics.completedLate} tareas fuera de plazo
              </span>
            </div>
          </div>

          {/* Semáforo Distribution */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Distribución por Niveles de Semáforo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-center">
                <span className="text-lg font-bold text-emerald-800">{colorCounts.green}</span>
                <p className="text-[10px] font-bold text-emerald-700 uppercase mt-0.5">Verde (0-24%)</p>
              </div>
              <div className="p-2.5 rounded-lg border border-sky-300 bg-sky-50 text-center">
                <span className="text-lg font-bold text-sky-800">{colorCounts.blue}</span>
                <p className="text-[10px] font-bold text-sky-700 uppercase mt-0.5">Azul (25-49%)</p>
              </div>
              <div className="p-2.5 rounded-lg border border-yellow-300 bg-yellow-50 text-center">
                <span className="text-lg font-bold text-yellow-800">{colorCounts.yellow}</span>
                <p className="text-[10px] font-bold text-yellow-700 uppercase mt-0.5">Amarillo (50-74%)</p>
              </div>
              <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-center">
                <span className="text-lg font-bold text-amber-900">{colorCounts.orange}</span>
                <p className="text-[10px] font-bold text-amber-800 uppercase mt-0.5">Naranja (75-89%)</p>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-center">
                <span className="text-lg font-bold text-rose-800">{colorCounts.red}</span>
                <p className="text-[10px] font-bold text-rose-700 uppercase mt-0.5">Rojo (90-99%)</p>
              </div>
              <div className="p-2.5 rounded-lg border border-stone-800 bg-stone-900 text-center text-amber-200">
                <span className="text-lg font-bold text-amber-200">{colorCounts.black}</span>
                <p className="text-[10px] font-bold text-amber-300 uppercase mt-0.5">Negro (Vencida)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
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
