import React from 'react';
import { InAppNotification } from '../services/notifications';
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, X, Trash2 } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onSelectTask: (taskId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onDismiss,
  onClearAll,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Centro de Notificaciones</h2>
              <p className="text-xs text-slate-500">{notifications.length} avisos y recordatorios registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar todo
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No hay notificaciones pendientes</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Las alertas de tareas vencidas, briefings diarios y resúmenes semanales aparecerán aquí.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const getIcon = () => {
                switch (n.type) {
                  case 'overdue':
                    return <AlertCircle className="w-5 h-5 text-rose-600" />;
                  case 'warning':
                    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
                  case 'success':
                    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                  case 'reminder':
                    return <Bell className="w-5 h-5 text-indigo-600" />;
                  default:
                    return <Info className="w-5 h-5 text-blue-500" />;
                }
              };

              const getBgColor = () => {
                switch (n.type) {
                  case 'overdue':
                    return 'bg-rose-50/60 border-rose-200';
                  case 'warning':
                    return 'bg-amber-50/60 border-amber-200';
                  case 'success':
                    return 'bg-emerald-50/60 border-emerald-200';
                  default:
                    return 'bg-slate-50/80 border-slate-200';
                }
              };

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${getBgColor()}`}
                >
                  <div className="shrink-0 mt-0.5">{getIcon()}</div>
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (n.taskId) {
                        onSelectTask(n.taskId);
                        onClose();
                      }
                    }}
                  >
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{n.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{n.body}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.taskId && (
                        <span className="text-[10px] font-bold text-blue-600 hover:underline">
                          Ver tarea →
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onDismiss(n.id)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
                    title="Eliminar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
