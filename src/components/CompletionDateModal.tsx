import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { CheckCircle2, Calendar, Clock, AlertTriangle, ArrowRight, X, Sparkles } from 'lucide-react';

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
  const [completedAt, setCompletedAt] = useState<string>('');

  useEffect(() => {
    if (isOpen && task) {
      // Default to current time when opening
      setCompletedAt(new Date().toISOString());
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const currentNow = new Date();
  const scheduledEnd = new Date(task.endDate);
  
  const selectedDate = completedAt ? new Date(completedAt) : new Date();
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

  const handleSetNow = () => {
    setCompletedAt(new Date().toISOString());
  };

  const handleSetScheduled = () => {
    setCompletedAt(task.endDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIso = completedAt ? new Date(completedAt).toISOString() : new Date().toISOString();
    onConfirm(finalIso);
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
              <h2 className="text-base font-black">Fecha Real de Cierre</h2>
              <p className="text-xs text-emerald-100 font-medium">Confirma cuándo se completó esta tarea</p>
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
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tarea a Completar
            </span>
            <p className="text-sm font-bold text-slate-800 line-clamp-2 mt-0.5">{task.title}</p>
          </div>

          {/* Quick Selection Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Accesos Rápidos de Fecha
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSetNow}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fecha actual (Ahora)</span>
              </button>
              <button
                type="button"
                onClick={handleSetScheduled}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Fecha Programada</span>
              </button>
            </div>
          </div>

          {/* Date Time Picker Component */}
          <div>
            <CustomDateTimePicker
              label="Fecha y Hora Exacta de Entrega / Cierre"
              value={completedAt}
              onChange={(newVal) => setCompletedAt(newVal)}
              required
            />
          </div>

          {/* Timeliness & Impact Preview */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs transition-colors ${
            isLate
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Fecha Línea Programada:</span>
              <span className="font-bold text-slate-700">{formatDate(scheduledEnd)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="font-bold flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                Fecha de Cierre Registrada:
              </span>
              <span className="font-black px-2 py-0.5 rounded-md border bg-white/90 shadow-2xs">
                {formatDate(selectedDate)}
              </span>
            </div>

            <div className="pt-1.5 flex items-center gap-1.5 font-bold">
              {isLate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-700">
                    Con retraso de <strong>{formatTimeDifference(timeDiffMs)}</strong> respecto al límite programado.
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">
                    ¡Completada a tiempo! ({timeDiffMs > 0 ? `${formatTimeDifference(timeDiffMs)} antes del límite` : 'Puntual'})
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
              className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-emerald-200 cursor-pointer flex items-center gap-1.5"
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
