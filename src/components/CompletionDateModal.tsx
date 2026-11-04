import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { CheckCircle2, Calendar, Clock, AlertTriangle, ArrowRight, X, Sparkles, Edit3 } from 'lucide-react';

interface CompletionDateModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onConfirm: (completedAtIso: string) => void;
}

export const CompletionDateModal: React.FC<CompletionDateModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm,
}) => {
  const [closureOption, setClosureOption] = useState<'scheduled' | 'now' | 'custom'>('scheduled');
  const [customCompletedAt, setCustomCompletedAt] = useState<string>('');

  useEffect(() => {
    if (isOpen && task) {
      // Default to scheduled end date or current time if overdue
      setClosureOption('scheduled');
      setCustomCompletedAt(new Date().toISOString());
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const scheduledEnd = new Date(task.endDate);

  const getEffectiveCompletedIso = (): string => {
    if (closureOption === 'scheduled') return task.endDate;
    if (closureOption === 'now') return new Date().toISOString();
    return customCompletedAt || new Date().toISOString();
  };

  const currentCompletedIso = getEffectiveCompletedIso();
  const selectedDate = new Date(currentCompletedIso);
  const isValidDate = !isNaN(selectedDate.getTime());
  
  const isLate = isValidDate && selectedDate.getTime() > scheduledEnd.getTime();
  const timeDiffMs = isValidDate ? Math.abs(selectedDate.getTime() - scheduledEnd.getTime()) : 0;
  
  const formatTimeDifference = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remHours = hours % 24;
      return `${days}d ${remHours > 0 ? `${remHours}h` : ''}`;
    }
    if (hours > 0) {
      const remMins = minutes % 60;
      return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`;
    }
    return `${Math.max(1, minutes)} min`;
  };

  const formatDate = (date: Date) => {
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(getEffectiveCompletedIso());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs text-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">Registrar Fecha de Cierre</h2>
              <p className="text-xs text-emerald-100 font-medium">Define cómo contabilizar la finalización</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Tarea a Completar
            </span>
            <p className="text-sm font-black text-slate-800 line-clamp-2 mt-0.5">{task.title}</p>
          </div>

          {/* 3 Main Closure Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              ¿Con qué fecha deseas registrar el cierre?
            </label>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Scheduled Date */}
              <button
                type="button"
                onClick={() => setClosureOption('scheduled')}
                className={`flex items-start gap-3 p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                  closureOption === 'scheduled'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  closureOption === 'scheduled' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold">Dejar Fecha Planificada</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Puntual
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDate(scheduledEnd)} (Fecha límite original)
                  </p>
                </div>
              </button>

              {/* Option 2: Current Moment (Now) */}
              <button
                type="button"
                onClick={() => setClosureOption('now')}
                className={`flex items-start gap-3 p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                  closureOption === 'now'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  closureOption === 'now' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold">Fecha y Hora Actual (Ahora)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      Tiempo Real
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDate(new Date())}
                  </p>
                </div>
              </button>

              {/* Option 3: Custom Date Picker */}
              <button
                type="button"
                onClick={() => setClosureOption('custom')}
                className={`flex items-start gap-3 p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                  closureOption === 'custom'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  closureOption === 'custom' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold">Personalizar Fecha de Cierre</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      Manual
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Especificar un día u hora diferente del pasado o presente
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Date Time Picker if Option 3 selected */}
          {closureOption === 'custom' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
              <CustomDateTimePicker
                label="Seleccionar Fecha y Hora Personalizada de Cierre"
                value={customCompletedAt}
                onChange={(newVal) => setCustomCompletedAt(newVal)}
                required
              />
            </div>
          )}

          {/* Performance & Effectiveness Assessment Card */}
          <div className={`p-3.5 rounded-2xl border space-y-1.5 text-xs transition-colors ${
            isLate
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span className="font-medium">Límite Planificado:</span>
              <span className="font-bold text-slate-700">{formatDate(scheduledEnd)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
              <span className="font-bold flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                Fecha Registrada:
              </span>
              <span className="font-black px-2 py-0.5 rounded-md border bg-white/90 shadow-2xs">
                {formatDate(selectedDate)}
              </span>
            </div>

            <div className="pt-1 flex items-center gap-1.5 font-bold">
              {isLate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800">
                    Con retraso de <strong>{formatTimeDifference(timeDiffMs)}</strong> respecto al fin previsto.
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800">
                    {timeDiffMs === 0 || closureOption === 'scheduled'
                      ? '¡Finalizada en la fecha planificada exacta!'
                      : `¡Cerrada con ${formatTimeDifference(timeDiffMs)} de anticipación!`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-emerald-200 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Cierre Real
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

