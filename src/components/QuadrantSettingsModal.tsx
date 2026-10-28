import React, { useState } from 'react';
import { QuadrantConfig, DEFAULT_QUADRANT_CONFIG } from '../types';
import { Settings2, X, RotateCcw, Check, Flame, Compass } from 'lucide-react';

interface QuadrantSettingsModalProps {
  isOpen: boolean;
  config: QuadrantConfig;
  onClose: () => void;
  onSave: (newConfig: QuadrantConfig) => void;
}

export const QuadrantSettingsModal: React.FC<QuadrantSettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<QuadrantConfig>({ ...config });

  if (!isOpen) return null;

  // Cascading update handlers
  const handleQ1DaysChange = (val: number) => {
    const q1 = Math.max(1, isNaN(val) ? 1 : val);
    setFormData((prev) => {
      const q2CustomDays = Math.max(q1 + 1, prev.q2CustomDays);
      return {
        ...prev,
        q1Days: q1,
        q2CustomDays,
      };
    });
  };

  const handleQ2CustomDaysChange = (val: number) => {
    setFormData((prev) => {
      const minAllowed = prev.q1Days + 1;
      const q2Custom = Math.max(minAllowed, isNaN(val) ? minAllowed : val);
      return {
        ...prev,
        q2CustomDays: q2Custom,
      };
    });
  };

  const handleQ3DaysChange = (val: number) => {
    const q3 = Math.max(1, isNaN(val) ? 1 : val);
    setFormData((prev) => {
      const q4 = Math.max(q3 + 1, prev.q4DaysPostSunday);
      return {
        ...prev,
        q3DaysPostSunday: q3,
        q4DaysPostSunday: q4,
      };
    });
  };

  const handleQ4DaysChange = (val: number) => {
    setFormData((prev) => {
      const minAllowed = prev.q3DaysPostSunday + 1;
      const q4 = Math.max(minAllowed, isNaN(val) ? minAllowed : val);
      return {
        ...prev,
        q4DaysPostSunday: q4,
      };
    });
  };

  const handleQ7DaysChange = (val: number) => {
    const q7 = Math.max(1, isNaN(val) ? 1 : val);
    setFormData((prev) => {
      const q8 = Math.max(q7 + 1, prev.q8DaysPostSunday);
      return {
        ...prev,
        q7DaysPostSunday: q7,
        q8DaysPostSunday: q8,
      };
    });
  };

  const handleQ8DaysChange = (val: number) => {
    setFormData((prev) => {
      const minAllowed = prev.q7DaysPostSunday + 1;
      const q8 = Math.max(minAllowed, isNaN(val) ? minAllowed : val);
      return {
        ...prev,
        q8DaysPostSunday: q8,
      };
    });
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_QUADRANT_CONFIG });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const q2EndText = formData.q2UseNextSunday ? 'Siguiente Domingo' : `${formData.q2CustomDays}d`;
  const q6EndText = formData.q6UseNextSunday ? 'Siguiente Domingo' : `${formData.q6CustomDays}d`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-1.5 sm:p-3 md:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white p-3.5 sm:p-5 md:p-6 shadow-2xl border border-slate-200 my-2 sm:my-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Personalizar Plazos de Cuadrantes (Q1 a Q9)
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
          {/* SECCIÓN 1: ZONA DE EJECUCIÓN (Q1 A Q5) */}
          <div className="p-3 sm:p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-900">
                  Zona de Ejecución: Tareas que ya iniciaron (Q1 a Q5)
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
                Cadena Encadenada (Q1 → Q5)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              {/* Q1 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-black">Q1</span>
                    <label className="text-xs font-bold text-slate-900">1. Urgencia Extrema</label>
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold mb-1.5">
                    Vencidas o límite máximo de entrega:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold">&lt;</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.q1Days}
                      onChange={(e) => handleQ1DaysChange(parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 font-bold">días</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-rose-700 bg-rose-50/50 p-1.5 rounded-md">
                  Q1: Vencidas y &lt; {formData.q1Days}d
                </div>
              </div>

              {/* Q2 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[10px] font-black">Q2</span>
                    <label className="text-xs font-bold text-slate-900">2. Entrega Corta</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Desde {formData.q1Days}d (Fin de Q1) hasta:
                  </p>
                  <div className="space-y-1 my-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="q2Mode"
                        checked={formData.q2UseNextSunday}
                        onChange={() => setFormData((prev) => ({ ...prev, q2UseNextSunday: true }))}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Fin del Siguiente Domingo</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="q2Mode"
                        checked={!formData.q2UseNextSunday}
                        onChange={() => setFormData((prev) => ({ ...prev, q2UseNextSunday: false }))}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Días fijos (&gt; {formData.q1Days}d)</span>
                    </label>
                  </div>

                  {!formData.q2UseNextSunday && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-semibold">Entrega en &lt;</span>
                      <input
                        type="number"
                        min={formData.q1Days + 1}
                        max={60}
                        value={formData.q2CustomDays}
                        onChange={(e) => handleQ2CustomDaysChange(parseInt(e.target.value, 10))}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">días</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-amber-800 bg-amber-50/50 p-1.5 rounded-md">
                  Q2: Desde {formData.q1Days}d hasta {q2EndText}
                </div>
              </div>

              {/* Q3 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[10px] font-black">Q3</span>
                    <label className="text-xs font-bold text-slate-900">3. Recta Final</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Desde {q2EndText} (Fin de Q2) hasta:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={formData.q3DaysPostSunday}
                      onChange={(e) => handleQ3DaysChange(parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">días post-Dom</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-blue-800 bg-blue-50/50 p-1.5 rounded-md">
                  Q3: Desde {q2EndText} hasta {formData.q3DaysPostSunday}d post-Dom
                </div>
              </div>

              {/* Q4 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-orange-500 text-white text-[10px] font-black">Q4</span>
                    <label className="text-xs font-bold text-slate-900">4. Entrega Intermedia</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Desde {formData.q3DaysPostSunday}d post-Dom (Fin de Q3) hasta:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min={formData.q3DaysPostSunday + 1}
                      max={90}
                      value={formData.q4DaysPostSunday}
                      onChange={(e) => handleQ4DaysChange(parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">días post-Dom</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-orange-800 bg-orange-50/50 p-1.5 rounded-md">
                  Q4: Desde {formData.q3DaysPostSunday}d hasta {formData.q4DaysPostSunday}d post-Dom
                </div>
              </div>

              {/* Q5 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-2 flex flex-col justify-between sm:col-span-2 lg:col-span-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-yellow-500 text-white text-[10px] font-black">Q5</span>
                    <label className="text-xs font-bold text-slate-900">5. Entrega a Largo Plazo</label>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Depende directamente del límite de Q4. Agrupa automáticamente todas las tareas activas cuya fecha de entrega sea superior a {formData.q4DaysPostSunday} días post-domingo.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-yellow-900 bg-yellow-50/80 p-1.5 rounded-md">
                  Q5: Más de {formData.q4DaysPostSunday}d post-Dom (Fin de Q4 en adelante)
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ZONA DE PLANIFICACIÓN (Q6 A Q9) */}
          <div className="p-3 sm:p-4 rounded-xl bg-sky-50/50 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-600 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-sky-900">
                  Zona de Planificación: Fechas de Inicio (Q6 a Q9)
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 shrink-0">
                Arranques Consecutivos (Q6 → Q9)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
              {/* Q6 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[10px] font-black">Q6</span>
                    <label className="text-xs font-bold text-slate-900">6. Transición</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Arranque antes de:
                  </p>
                  <div className="space-y-1 my-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="q6Mode"
                        checked={formData.q6UseNextSunday}
                        onChange={() => setFormData((prev) => ({ ...prev, q6UseNextSunday: true }))}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span>Fin del Siguiente Domingo</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="q6Mode"
                        checked={!formData.q6UseNextSunday}
                        onChange={() => setFormData((prev) => ({ ...prev, q6UseNextSunday: false }))}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span>Días fijos</span>
                    </label>
                  </div>

                  {!formData.q6UseNextSunday && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-semibold">Inicia &lt;</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.q6CustomDays}
                        onChange={(e) => setFormData((prev) => ({ ...prev, q6CustomDays: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">días</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-sky-800 bg-sky-50/50 p-1.5 rounded-md">
                  Q6: Inicia antes del {q6EndText}
                </div>
              </div>

              {/* Q7 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-stone-700 text-white text-[10px] font-black">Q7</span>
                    <label className="text-xs font-bold text-slate-900">7. Arranque Corto</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Desde {q6EndText} (Fin de Q6) hasta:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={formData.q7DaysPostSunday}
                      onChange={(e) => handleQ7DaysChange(parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">días post-Dom</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-stone-800 bg-stone-100/60 p-1.5 rounded-md">
                  Q7: Desde {q6EndText} hasta {formData.q7DaysPostSunday}d post-Dom
                </div>
              </div>

              {/* Q8 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-600 text-white text-[10px] font-black">Q8</span>
                    <label className="text-xs font-bold text-slate-900">8. En Cola</label>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1">
                    Desde {formData.q7DaysPostSunday}d post-Dom (Fin de Q7) hasta:
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min={formData.q7DaysPostSunday + 1}
                      max={90}
                      value={formData.q8DaysPostSunday}
                      onChange={(e) => handleQ8DaysChange(parseInt(e.target.value, 10))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">días post-Dom</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-800 bg-slate-100/60 p-1.5 rounded-md">
                  Q8: Desde {formData.q7DaysPostSunday}d hasta {formData.q8DaysPostSunday}d post-Dom
                </div>
              </div>

              {/* Q9 Card */}
              <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-400 text-white text-[10px] font-black">Q9</span>
                    <label className="text-xs font-bold text-slate-900">9. Planificación Lejana</label>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Depende del límite de Q8. Agrupa tareas no iniciadas con fecha de inicio a más de {formData.q8DaysPostSunday} días post-domingo.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-700 bg-slate-100/60 p-1.5 rounded-md">
                  Q9: Más de {formData.q8DaysPostSunday}d post-Dom (Fin de Q8 en adelante)
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer por defecto</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


