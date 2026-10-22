import React from 'react';
import { InAppNotification } from '../services/notifications';
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface InAppNotificationToastProps {
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
  onSelectTask?: (taskId: string) => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  notifications,
  onDismiss,
  onSelectTask,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.slice(-4).map((n) => {
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

        const getBorderColor = () => {
          switch (n.type) {
            case 'overdue':
              return 'border-rose-400 bg-rose-50/95';
            case 'warning':
              return 'border-amber-400 bg-amber-50/95';
            case 'success':
              return 'border-emerald-400 bg-emerald-50/95';
            default:
              return 'border-indigo-400 bg-white/95';
          }
        };

        return (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-8 ${getBorderColor()}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{getIcon()}</div>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => n.taskId && onSelectTask && onSelectTask(n.taskId)}
              >
                <h4 className="text-sm font-bold text-slate-900 leading-tight">{n.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-snug">{n.body}</p>
                <span className="text-[10px] text-slate-400 mt-1.5 block">
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
