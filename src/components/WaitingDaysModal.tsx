import React, { useState, useEffect } from 'react';
import { TaskItem } from '../types';
import { Hourglass, Calendar, Clock, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface WaitingDaysModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onConfirm: (days: number) => void;
}

export const WaitingDaysModal: React.FC<WaitingDaysModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm,
}) => {
  const [days, setDays] = useState<number>(2);

  useEffect(() => {
    if (isOpen) {
      setDays(2);
    }
  }, [isOpen]);

  if (!isOpen || !task) return null;

  const currentEnd = new Date(task.endDate);
  const validDays = Math.max(1, isNaN(days) ? 1 : Math.round(days));
  const newEnd = new Date(currentEnd.getTime() + validDays * 24 * 60 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(validDays);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs text-purple-100">
              <Hourglass className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-base font-black">Poner Tarea en Espera</h2>
              <p className="text-xs text-purple-200 font-medium">Postergar entrega por bloqueo temporal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tarea Seleccionada
            </span>
            <p className="text-sm font-bold text-slate-800 line-clamp-1 mt-0.5">{task.title}</p>
          </div>

          {/* Days Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ¿Cuántos días estará en espera?
            </label>

            {/* Quick buttons */}
            <div className="grid grid-cols-5 gap-1.5 mb-2.5">
              {[1, 2, 3, 4, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDays(num)}
                  className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    validDays === num
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  +{num} {num === 1 ? 'día' : 'días'}
                </button>
              ))}
            </div>

            {/* Numeric input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="w-24 px-3 py-1.5 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-center"
              />
              <span className="text-xs text-slate-600 font-medium">días en total a postergar</span>
            </div>
          </div>

          {/* Impact preview */}
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">Fecha de entrega actual:</span>
              <span className="font-bold text-slate-700">{formatDate(currentEnd)}</span>
            </div>

            <div className="flex items-center justify-between text-purple-900 pt-1 border-t border-purple-200/60">
              <span className="font-bold flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                Nueva fecha de entrega:
              </span>
              <span className="font-black text-purple-800 bg-white/80 px-2 py-0.5 rounded-md border border-purple-300">
                {formatDate(newEnd)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 pt-1 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Historial de fricción: suma <strong>+5 pts</strong> permanentes ({((task.frictionPoints || 0) + 5)} pts totales).
              </span>
            </div>
          </div>

          {/* Action buttons */}
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
              className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-purple-200 cursor-pointer"
            >
              Confirmar y Sumar {validDays} {validDays === 1 ? 'Día' : 'Días'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
