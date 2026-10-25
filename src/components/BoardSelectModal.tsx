import React, { useState } from 'react';
import { Board, TaskItem } from '../types';
import { FolderKanban, Plus, Check, X, Trash2, Pencil } from 'lucide-react';
import { BoardModal } from './BoardModal';

interface BoardSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onAddBoard: (name: string, description: string, color: string) => void;
  onUpdateBoard: (boardId: string, name: string, description: string, color: string) => void;
  onDeleteBoard: (boardId: string) => void;
  allTasks: TaskItem[];
}

export const BoardSelectModal: React.FC<BoardSelectModalProps> = ({
  isOpen,
  onClose,
  boards,
  currentBoardId,
  onSelectBoard,
  onAddBoard,
  onUpdateBoard,
  onDeleteBoard,
  allTasks,
}) => {
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  if (!isOpen) return null;

  const handleOpenCreateModal = () => {
    setEditingBoard(null);
    setIsBoardModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    setEditingBoard(board);
    setIsBoardModalOpen(true);
  };

  const handleSaveBoardModal = (name: string, description: string, color: string) => {
    if (editingBoard) {
      onUpdateBoard(editingBoard.id, name, description, color);
    } else {
      onAddBoard(name, description, color);
    }
    setIsBoardModalOpen(false);
    setEditingBoard(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Seleccionar Tablero</h3>
                <p className="text-xs text-slate-500">Cambia, renombra o crea un nuevo espacio de trabajo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Board List */}
          <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
            {/* ⭐ Master Board Option (Consolidation of all boards) */}
            {(() => {
              const isMasterSelected = currentBoardId === 'master';
              const totalActiveTasks = allTasks.filter((t) => t.status !== 'done').length;

              return (
                <div
                  onClick={() => {
                    onSelectBoard('master');
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                    isMasterSelected
                      ? 'border-indigo-600 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/40 shadow-xs ring-2 ring-indigo-400/40'
                      : 'border-indigo-200/90 hover:border-indigo-400 bg-gradient-to-r from-indigo-50/30 to-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      ⭐
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          Tablero Master
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white shadow-2xs">
                          Global
                        </span>
                        {isMasterSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-900">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        Suma y consolida las tareas de <strong>todos</strong> tus tableros ({boards.length} tableros)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-700">{totalActiveTasks}</span>
                      <span className="text-[10px] text-slate-400 block">totales</span>
                    </div>
                    {isMasterSelected && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Individual Boards Header */}
            <div className="pt-2 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tableros Individuales ({boards.length})
              </span>
            </div>

            {boards.map((b) => {
              const isSelected = b.id === currentBoardId;
              const taskCount = allTasks.filter(
                (t) => (t.boardId === b.id || (!t.boardId && b.id === 'board-work')) && t.status !== 'done'
              ).length;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBoard(b.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] group ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-400/40'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: b.color }}
                    />
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{b.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-600 text-white">
                            Activo
                          </span>
                        )}
                      </div>
                      {b.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{b.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Rename / Edit Button in Modal */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(e, b)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                      title="Cambiar nombre / Editar tablero"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBoard(b.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Eliminar tablero"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800">{taskCount}</span>
                      <span className="text-[10px] text-slate-400 block">activas</span>
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* New Board Modal Trigger */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="w-full py-3.5 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/60 rounded-2xl text-xs font-bold text-blue-600 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Tablero (Abrir Modal)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Create/Edit Board Modal */}
      <BoardModal
        isOpen={isBoardModalOpen}
        onClose={() => {
          setIsBoardModalOpen(false);
          setEditingBoard(null);
        }}
        onSave={handleSaveBoardModal}
        board={editingBoard}
      />
    </>
  );
};

