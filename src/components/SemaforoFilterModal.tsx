import React from 'react';
import { TimeColorLevel, TaskItem } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { Clock, X, Check, Filter } from 'lucide-react';

interface SemaforoFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColor: TimeColorLevel | 'all';
  onSelectColor: (color: TimeColorLevel | 'all') => void;
  tasks: TaskItem[];
}

export const SemaforoFilterModal: React.FC<SemaforoFilterModalProps> = ({
  isOpen,
  onClose,
  selectedColor,
  onSelectColor,
  tasks,
}) => {
  if (!isOpen) return null;

  // Calculate task counts per level
  const counts: Record<TimeColorLevel | 'all', number> = {
    all: tasks.length,
    green: 0,
    blue: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    black: 0,
  };

  tasks.forEach((t) => {
    const calc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), t.status === 'done');
    counts[calc.level] = (counts[calc.level] || 0) + 1;
  });

  const levels: {
    id: TimeColorLevel | 'all';
    label: string;
    range: string;
    desc: string;
    cardBg: string;
    dotBg: string;
    textClass: string;
  }[] = [
    {
      id: 'all',
      label: 'Todos los niveles',
      range: 'Sin filtrar',
      desc: 'Muestra todas las tareas activas',
      cardBg: 'bg-white hover:bg-slate-50 border-slate-200',
      dotBg: 'bg-slate-700',
      textClass: 'text-slate-800',
    },
    {
      id: 'green',
      label: 'Verde',
      range: '> 50% tiempo restante',
      desc: 'A tiempo, holgura suficiente para completar',
      cardBg: 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-300',
      dotBg: 'bg-emerald-500',
      textClass: 'text-emerald-900',
    },
    {
      id: 'blue',
      label: 'Azul',
      range: '30% a 50% tiempo restante',
      desc: 'Atención preventiva, avance regular',
      cardBg: 'bg-sky-50/70 hover:bg-sky-100/60 border-sky-300',
      dotBg: 'bg-sky-500',
      textClass: 'text-sky-900',
    },
    {
      id: 'yellow',
      label: 'Amarillo',
      range: '15% a 30% tiempo restante',
      desc: 'Prioridad media, acelerar ejecución',
      cardBg: 'bg-yellow-50/70 hover:bg-yellow-100/60 border-yellow-300',
      dotBg: 'bg-yellow-500',
      textClass: 'text-yellow-950',
    },
    {
      id: 'orange',
      label: 'Naranja',
      range: '5% a 15% tiempo restante',
      desc: 'Urgente, margen crítico de entrega',
      cardBg: 'bg-amber-50/70 hover:bg-amber-100/60 border-amber-300',
      dotBg: 'bg-amber-500',
      textClass: 'text-amber-950',
    },
    {
      id: 'red',
      label: 'Rojo',
      range: '< 5% tiempo restante',
      desc: 'Crítico inmediato, próxima a vencer',
      cardBg: 'bg-rose-50/70 hover:bg-rose-100/60 border-rose-300',
      dotBg: 'bg-rose-500 animate-pulse',
      textClass: 'text-rose-950',
    },
    {
      id: 'black',
      label: 'Negro',
      range: 'Plazo expirado (0%)',
      desc: 'Vencida, fuera del plazo límite',
      cardBg: 'bg-stone-900 text-white hover:bg-black border-stone-800',
      dotBg: 'bg-amber-400',
      textClass: 'text-amber-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Filtrar por Semáforo</h2>
              <p className="text-[11px] text-slate-500">
                Selecciona una franja de urgencia temporal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Cards List */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {levels.map((lvl) => {
            const isSelected = selectedColor === lvl.id;
            const count = counts[lvl.id];

            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  onSelectColor(lvl.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  lvl.cardBg
                } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 font-bold' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${lvl.dotBg}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${lvl.textClass}`}>{lvl.label}</span>
                      <span className="text-[10px] opacity-75 font-medium">{lvl.range}</span>
                    </div>
                    <p className="text-[10px] opacity-70 truncate mt-0.5">{lvl.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      lvl.id === 'black'
                        ? 'bg-stone-800 text-amber-300'
                        : 'bg-white/80 border border-slate-200/70 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onSelectColor('all');
              onClose();
            }}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
          >
            Limpiar filtro
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
