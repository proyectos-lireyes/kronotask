import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  User,
  TrendingUp,
  Settings,
  Bell,
  LogOut,
  ShieldAlert,
  ChevronDown,
  FolderKanban,
  Check,
  Smartphone,
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  onOpenUpdates?: () => void;
  onOpenGlobalDashboard: () => void;
  isGlobalDashboardActive: boolean;
  collisionCount?: number;
  onOpenNotifications: () => void;
  notificationCount?: number;
  onOpenBoardSelect: () => void;
  currentBoardName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onGoogleSignIn,
  onLogout,
  isLoggingIn,
  onOpenReports,
  onOpenSettings,
  onOpenUpdates,
  onOpenGlobalDashboard,
  isGlobalDashboardActive,
  collisionCount = 0,
  onOpenNotifications,
  notificationCount = 0,
  onOpenBoardSelect,
  currentBoardName,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Side: Profile Management Button + Board Selector (ChronoTask text removed as requested) */}
        <div className="flex items-center gap-2">
          {/* Profile Management Button (where the clock was) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all active:scale-95 overflow-hidden"
              title="Gestión de Perfil, Google y Ajustes"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover"
                />
              ) : currentUser ? (
                <span className="font-bold text-xs">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-4.5 h-4.5" />
              )}
            </button>

            {/* Profile & Settings Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                  {currentUser ? (
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {currentUser.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                          <Check className="w-3 h-3" /> Conectado con Google
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-1">
                      <p className="text-xs font-bold text-slate-800">Modo Local</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inicia sesión con Google para sincronizar tus tareas en la nube.
                      </p>
                    </div>
                  )}
                </div>

                {/* Google Sign In / Sign Out Button */}
                <div className="mb-2">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Cerrar Sesión de Google
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoggingIn}
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onGoogleSignIn();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 my-2" />

                {/* Ajustes Button inside Profile menu */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ajustes del Sistema</p>
                      <p className="text-[10px] text-slate-400">
                        Tableros, Semáforo, Biometría, Tipos, Prioridades
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 -rotate-90" />
                </button>

                {/* Actualizaciones APK Android */}
                {onOpenUpdates && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenUpdates();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group mt-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Comprobar Actualizaciones</p>
                        <p className="text-[10px] text-slate-400">
                          Verificar si hay una nueva versión disponible
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 -rotate-90" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Board Selector Pill */}
          <button
            type="button"
            onClick={onOpenBoardSelect}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200/90 text-slate-800 rounded-xl text-xs font-bold border border-slate-200/80 cursor-pointer transition-colors max-w-[160px] sm:max-w-[220px]"
            title="Cambiar tablero de trabajo"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{currentBoardName}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Clean Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Global Dashboard / Collision detector button */}
          <button
            type="button"
            onClick={onOpenGlobalDashboard}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              isGlobalDashboardActive
                ? 'bg-blue-600 text-white shadow-xs'
                : collisionCount > 0
                ? 'bg-amber-100 hover:bg-amber-200/90 text-amber-900 border border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Dashboard Global y Detector de Colisiones de Horario"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] hidden sm:inline">Colisiones</span>
            {collisionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-900 shadow-2xs">
                {collisionCount}
              </span>
            )}
          </button>

          {/* Reports */}
          <button
            type="button"
            onClick={onOpenReports}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl flex items-center gap-1 cursor-pointer"
            title="Reportes de Cumplimiento (PDF & Excel)"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline text-[11px]">Reportes</span>
          </button>

          {/* Notifications Center Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              notificationCount > 0
                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
            title="Centro de Notificaciones"
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            {notificationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
