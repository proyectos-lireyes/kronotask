import React, { useState, useEffect } from 'react';
import { Board } from '../types';
import { FolderKanban, X, Check, Palette } from 'lucide-react';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, color: string) => void;
  board?: Board | null; // If provided, edit mode; else create mode
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#15803d', // Green
];

export const BoardModal: React.FC<BoardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  board,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');

  useEffect(() => {
    if (board) {
      setName(board.name || '');
      setDescription(board.description || '');
      setColor(board.color || '#2563eb');
    } else {
      setName('');
      setDescription('');
      setColor('#2563eb');
    }
  }, [board, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {board ? 'Editar Tablero' : 'Nuevo Tablero'}
              </h3>
              <p className="text-xs text-slate-500">
                {board ? 'Modifica los datos del tablero' : 'Crea un nuevo espacio para organizar tus tareas'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre del Tablero *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Finanzas, Proyecto Personal, Estudio..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Seguimiento de presupuestos y facturas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-600" />
              Color Identificador
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    color === c ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto bg-slate-100 px-2 py-1 rounded-xl">
                <span className="text-[11px] text-slate-500 font-medium">Personalizado:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded-lg border-0 cursor-pointer bg-transparent p-0"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              {board ? 'Guardar Cambios' : 'Crear Tablero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
