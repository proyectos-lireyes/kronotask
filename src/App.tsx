/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TaskItem,
  TaskStatus,
  CustomTag,
  LightThemeConfig,
  UserProfile,
  TimeColorLevel,
  BiometricRecord,
  Board,
  CustomTypeDefinition,
  CustomPriorityDefinition,
} from './types';
import {
  loadTasks,
  saveTasks,
  loadTags,
  saveTags,
  loadBoards,
  saveBoards,
  loadCustomTypes,
  saveCustomTypes,
  loadCustomPriorities,
  saveCustomPriorities,
  loadTheme,
  saveTheme,
  loadAcceptedCollisions,
  saveAcceptedCollisions,
} from './services/storage';
import { initAuth, googleSignIn, logout } from './services/firebase';
import { getBiometricRecord, isVaultLocked, setVaultLocked } from './services/biometrics';
import {
  InAppNotification,
  checkTaskRemindersAndSchedules,
  requestNotificationPermission,
  soundService,
} from './services/notifications';
import { calculateNextOccurrence } from './utils/recurrence';
import { calculateTimeLevel } from './utils/timeColor';
import { detectCollisions } from './utils/collisionUtils';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { GanttView } from './components/GanttView';
import { CalendarView } from './components/CalendarView';
import { HistoryView } from './components/HistoryView';
import { TaskListView } from './components/TaskListView';
import { GlobalDashboardView } from './components/GlobalDashboardView';
import { BoardSelectModal } from './components/BoardSelectModal';
import { TaskModal } from './components/TaskModal';
import { ReportsModal } from './components/ReportsModal';
import { SettingsModal } from './components/SettingsModal';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { NotificationsModal } from './components/NotificationsModal';
import { SemaforoFilterModal } from './components/SemaforoFilterModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import {
  FolderKanban,
  LayoutGrid,
  List,
  CalendarDays,
  BarChart3,
  History,
  ShieldAlert,
  Search,
  Plus,
  ChevronDown,
  Filter,
  Clock,
  Settings,
  X,
} from 'lucide-react';

export default function App() {
  // Persistence States
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [boards, setBoards] = useState<Board[]>(() => loadBoards());
  const [currentBoardId, setCurrentBoardId] = useState<string>(() => loadBoards()[0]?.id || 'board-work');
  const [types, setTypes] = useState<CustomTypeDefinition[]>(() => loadCustomTypes());
  const [priorities, setPriorities] = useState<CustomPriorityDefinition[]>(() => loadCustomPriorities());
  const [tags, setTags] = useState<CustomTag[]>(() => loadTags());
  const [theme, setTheme] = useState<LightThemeConfig>(() => loadTheme());
  const [acceptedCollisions, setAcceptedCollisions] = useState<string[]>(() => loadAcceptedCollisions());

  // User Auth & Biometrics
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [biometricRecord, setBiometricRecord] = useState<BiometricRecord>(() => getBiometricRecord());
  const [isLocked, setIsLocked] = useState<boolean>(() => isVaultLocked());

  // Views order requested by user:
  // tablero (modal trigger), kanban, tabla, calendario, gantt, historial (plus global dashboard)
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar' | 'gantt' | 'history' | 'global'>('kanban');

  // Modals
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('todo');
  const [initialBoardForNewTask, setInitialBoardForNewTask] = useState<string>('');
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSemaforoModalOpen, setIsSemaforoModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState<TimeColorLevel | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Notifications
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Safe ref for recurring checker
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const [, setTicker] = useState(0);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
        });
      },
      () => setCurrentUser(null)
    );
    return () => unsubscribe();
  }, []);

  // Safe interval for reminders and 4-day waiting state rollover
  useEffect(() => {
    const runCheck = () => {
      checkTaskRemindersAndSchedules(
        tasksRef.current,
        (notif) => {
          setInAppNotifications((prev) => [...prev, notif]);
        },
        (autoTaskId) => {
          setTasks((prev) => {
            const updated = prev.map((t) =>
              t.id === autoTaskId
                ? { ...t, status: 'in_progress' as TaskStatus, waitingSince: null, updatedAt: new Date().toISOString() }
                : t
            );
            saveTasks(updated);
            return updated;
          });
        }
      );
    };

    runCheck();
    const interval = setInterval(() => {
      setTicker((t) => t + 1);
      runCheck();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const updateTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) setCurrentUser(res.profile);
    } catch (e: any) {
      console.error(e);
      alert(`Error al acceder: ${e.message || 'Intente de nuevo'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let extraTask: TaskItem | null = null;
    if (newStatus === 'done' && task.recurrence?.enabled) {
      const { nextStart, nextEnd } = calculateNextOccurrence(task.startDate, task.endDate, task.recurrence);
      extraTask = {
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `${task.title} (Siguiente ciclo)`,
        status: 'todo',
        startDate: nextStart,
        endDate: nextEnd,
        completedAt: null,
        comments: [
          {
            id: `comm-rec-${Date.now()}`,
            authorName: 'Sistema de Periodicidad',
            authorEmail: 'system@chronotask.app',
            content: `Ciclo generado automáticamente tras completar el anterior.`,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        let waitingSince = t.waitingSince;
        if (newStatus === 'waiting' && !waitingSince) {
          waitingSince = new Date().toISOString();
        } else if (newStatus !== 'waiting') {
          waitingSince = null;
        }

        return {
          ...t,
          status: newStatus,
          waitingSince,
          completedAt: newStatus === 'done' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    if (extraTask) {
      updatedTasks.unshift(extraTask);
      setInAppNotifications((prev) => [
        ...prev,
        {
          id: `notif-rec-${Date.now()}`,
          title: 'Nuevo Ciclo Periódico',
          body: `Programado el siguiente ciclo de "${task.title}".`,
          type: 'info',
          timestamp: new Date().toISOString(),
          taskId: extraTask?.id,
        },
      ]);
    }

    updateTasks(updatedTasks);
  };

  const handleSaveTask = (taskToSave: TaskItem) => {
    const exists = tasks.some((t) => t.id === taskToSave.id);
    let updated: TaskItem[];
    if (exists) {
      updated = tasks.map((t) => (t.id === taskToSave.id ? taskToSave : t));
    } else {
      updated = [taskToSave, ...tasks];
    }
    updateTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    updateTasks(updated);
  };

  // Boards Management
  const handleAddBoard = (name: string, description: string, color: string) => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name,
      description,
      color,
      createdAt: new Date().toISOString(),
    };
    const updated = [...boards, newBoard];
    setBoards(updated);
    saveBoards(updated);
    setCurrentBoardId(newBoard.id);
  };

  const handleDeleteBoard = (boardId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este tablero y todas sus tareas asociadas?')) return;
    const updated = boards.filter((b) => b.id !== boardId);
    setBoards(updated);
    saveBoards(updated);
    if (currentBoardId === boardId && updated.length > 0) {
      setCurrentBoardId(updated[0].id);
    }
  };

  // Types Management
  const handleAddType = (name: string, color: string) => {
    const newType: CustomTypeDefinition = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      color,
    };
    const updated = [...types, newType];
    setTypes(updated);
    saveCustomTypes(updated);
  };

  const handleDeleteType = (typeId: string) => {
    const updated = types.filter((t) => t.id !== typeId);
    setTypes(updated);
    saveCustomTypes(updated);
  };

  // Priorities Management
  const handleAddPriority = (name: string, color: string) => {
    const newPriority: CustomPriorityDefinition = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      color,
      badgeBg: 'bg-slate-100 text-slate-800',
      level: priorities.length + 1,
    };
    const updated = [...priorities, newPriority];
    setPriorities(updated);
    saveCustomPriorities(updated);
  };

  const handleDeletePriority = (priorityId: string) => {
    const updated = priorities.filter((p) => p.id !== priorityId);
    setPriorities(updated);
    saveCustomPriorities(updated);
  };

  // Tags Management
  const handleAddTag = (name: string, color: string) => {
    const newTag: CustomTag = {
      id: `tag-${Date.now()}`,
      name,
      color,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveTags(updated);
  };

  const handleDeleteTag = (tagId: string) => {
    const updated = tags.filter((t) => t.id !== tagId);
    setTags(updated);
    saveTags(updated);
  };

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      soundService.playChime('reminder');
      alert('✓ Notificaciones Push activadas. Avisos diarios y semanales listos.');
    }
  };

  // Collision Counter using event & task collision business rules
  const collisionCount = useMemo(() => {
    return detectCollisions(tasks, boards, acceptedCollisions).filter((c) => !c.isAccepted).length;
  }, [tasks, boards, acceptedCollisions]);

  const handleResolveCollision = (taskIdToMove: string, newStartIso: string, newEndIso: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskIdToMove) {
        return {
          ...t,
          startDate: newStartIso,
          endDate: newEndIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    updateTasks(updated);
  };

  const handleToggleAcceptCollision = (pairKey: string) => {
    const updated = acceptedCollisions.includes(pairKey)
      ? acceptedCollisions.filter((k) => k !== pairKey)
      : [...acceptedCollisions, pairKey];
    setAcceptedCollisions(updated);
    saveAcceptedCollisions(updated);
  };

  // Biometrics Lock Screen
  if (isLocked) {
    return (
      <BiometricLockScreen
        onUnlocked={() => {
          setIsLocked(false);
          setVaultLocked(false);
        }}
      />
    );
  }

  // Master Board or Individual Board State
  const isMasterBoard = currentBoardId === 'master';
  const currentBoard: Board = isMasterBoard
    ? {
        id: 'master',
        name: '⭐ Tablero Master',
        description: 'Suma y consolida las tareas de todos tus tableros',
        color: '#6366f1',
        createdAt: '',
      }
    : boards.find((b) => b.id === currentBoardId) || boards[0] || {
        id: 'board-work',
        name: 'Trabajo',
        color: '#2563eb',
        createdAt: '',
      };

  const boardTasks = isMasterBoard
    ? tasks
    : tasks.filter((t) => t.boardId === currentBoard.id || (!t.boardId && currentBoard.id === 'board-work'));

  // Separate active vs completed
  const activeTasks = boardTasks.filter((t) => t.status !== 'done');
  const completedTasks = boardTasks.filter((t) => t.status === 'done');

  // Filtered Active Tasks by Semáforo & Search
  const filteredActiveTasks = activeTasks.filter((t) => {
    if (filterColor !== 'all') {
      const calc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), false);
      if (calc.level !== filterColor) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterTag !== 'all' && !t.tags.includes(filterTag)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-20 md:pb-6 select-text">
      {/* Clean Uncluttered Header */}
      <Header
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUpdates={() => setIsUpdateModalOpen(true)}
        onOpenGlobalDashboard={() => setViewMode('global')}
        isGlobalDashboardActive={viewMode === 'global'}
        collisionCount={collisionCount}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        notificationCount={inAppNotifications.length}
        onOpenBoardSelect={() => setIsBoardModalOpen(true)}
        currentBoardName={isMasterBoard ? 'Tablero Master' : currentBoard.name}
      />

      {/* Main Single-Scroll Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Desktop Views Switcher: Kanban, Tabla, Calendario, Gantt, Historial */}
          <div className="hidden md:flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'gantt' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gantt</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                viewMode === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {completedTasks.length}
              </span>
            </button>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex items-center justify-between gap-2 w-full md:w-auto">
            {/* Mobile-only Historial button */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'history' ? 'kanban' : 'history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  viewMode === 'history'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Historial de tareas completadas"
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  viewMode === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {completedTasks.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Semáforo modal trigger button */}
            <button
              type="button"
              onClick={() => setIsSemaforoModalOpen(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold ${
                filterColor !== 'all'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filtrar por color de semáforo"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] hidden sm:inline">Semáforo</span>
              {filterColor !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* View Component Rendering */}
        {viewMode === 'kanban' && (
          <KanbanBoard
            tasks={filteredActiveTasks}
            allTags={tags}
            allBoards={boards}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleTaskStatusChange}
            onAddTaskToColumn={(status) => {
              const targetBoard = currentBoardId === 'master' ? (boards[0]?.id || 'board-work') : currentBoardId;
              setSelectedTask(null);
              setInitialStatusForNewTask(status);
              setInitialBoardForNewTask(targetBoard);
              setIsTaskModalOpen(true);
            }}
            filterColor={filterColor}
            filterPriority={filterPriority}
            filterType={filterType}
            filterTag={filterTag}
            searchQuery={searchQuery}
          />
        )}

        {viewMode === 'table' && (
          <TaskListView
            tasks={filteredActiveTasks}
            allTags={tags}
            allBoards={boards}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleTaskStatusChange}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            tasks={filteredActiveTasks}
            allBoards={boards}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onAddTaskOnDate={(date) => {
              const targetBoard = currentBoardId === 'master' ? (boards[0]?.id || 'board-work') : currentBoardId;
              setSelectedTask(null);
              setInitialStatusForNewTask('todo');
              setInitialBoardForNewTask(targetBoard);
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {viewMode === 'gantt' && (
          <GanttView
            tasks={filteredActiveTasks}
            allTags={tags}
            allBoards={boards}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {viewMode === 'history' && (
          <HistoryView
            completedTasks={completedTasks}
            allTags={tags}
            allBoards={boards}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onReopenTask={(taskId) => handleTaskStatusChange(taskId, 'in_progress')}
          />
        )}

        {viewMode === 'global' && (
          <GlobalDashboardView
            allTasks={tasks}
            allBoards={boards}
            allTags={tags}
            acceptedCollisions={acceptedCollisions}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onResolveCollision={handleResolveCollision}
            onToggleAcceptCollision={handleToggleAcceptCollision}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for Pocket Quick Add */}
      <button
        type="button"
        onClick={() => {
          const targetBoard = currentBoardId === 'master' ? (boards[0]?.id || 'board-work') : currentBoardId;
          setSelectedTask(null);
          setInitialStatusForNewTask('todo');
          setInitialBoardForNewTask(targetBoard);
          setIsTaskModalOpen(true);
        }}
        className="fixed bottom-18 right-4 md:bottom-6 md:right-8 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-300 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
        title="Crear nueva tarea"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Pocket Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        {/* Kanban */}
        <button
          type="button"
          onClick={() => setViewMode('kanban')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
            viewMode === 'kanban' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutGrid className="w-4.5 h-4.5" />
          <span>Kanban</span>
        </button>

        {/* Tabla */}
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
            viewMode === 'table' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <List className="w-4.5 h-4.5" />
          <span>Tabla</span>
        </button>

        {/* Calendario */}
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
            viewMode === 'calendar' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4.5 h-4.5" />
          <span>Calendario</span>
        </button>

        {/* Gantt */}
        <button
          type="button"
          onClick={() => setViewMode('gantt')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
            viewMode === 'gantt' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4.5 h-4.5" />
          <span>Gantt</span>
        </button>
      </nav>

      {/* Board Selection Modal */}
      <BoardSelectModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={(id) => setCurrentBoardId(id)}
        onAddBoard={handleAddBoard}
        onDeleteBoard={handleDeleteBoard}
        allTasks={tasks}
      />

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        task={selectedTask}
        initialStatus={initialStatusForNewTask}
        initialBoardId={initialBoardForNewTask}
        currentBoardId={currentBoardId}
        allBoards={boards}
        allTypes={types}
        allPriorities={priorities}
        allTags={tags}
        currentUser={currentUser}
        allTasks={tasks}
        acceptedCollisions={acceptedCollisions}
        onAcceptCollision={handleToggleAcceptCollision}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onAddTag={handleAddTag}
      />

      {/* Reports Modal */}
      <ReportsModal
        isOpen={isReportsOpen}
        tasks={boardTasks}
        onClose={() => setIsReportsOpen(false)}
      />

      {/* Settings Modal (with Biometrics and Semáforo inside) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        boards={boards}
        onAddBoard={handleAddBoard}
        onDeleteBoard={handleDeleteBoard}
        types={types}
        onAddType={handleAddType}
        onDeleteType={handleDeleteType}
        priorities={priorities}
        onAddPriority={handleAddPriority}
        onDeletePriority={handleDeletePriority}
        tags={tags}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
        currentTheme={theme}
        onThemeChange={(newTheme) => {
          setTheme(newTheme);
          saveTheme(newTheme);
        }}
        currentUser={currentUser}
        biometricRecord={biometricRecord}
        onBiometricStatusChange={() => {
          setBiometricRecord(getBiometricRecord());
          setIsLocked(isVaultLocked());
        }}
      />

      {/* Notifications Modal Center */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={inAppNotifications}
        onDismiss={(id) => setInAppNotifications((prev) => prev.filter((n) => n.id !== id))}
        onClearAll={() => setInAppNotifications([])}
        onSelectTask={(taskId) => {
          const t = tasks.find((item) => item.id === taskId);
          if (t) {
            setSelectedTask(t);
            setIsTaskModalOpen(true);
          }
        }}
      />

      {/* Semáforo Filter Modal */}
      <SemaforoFilterModal
        isOpen={isSemaforoModalOpen}
        onClose={() => setIsSemaforoModalOpen(false)}
        selectedColor={filterColor}
        onSelectColor={(color) => {
          setFilterColor(color);
          setIsSemaforoModalOpen(false);
        }}
        tasks={boardTasks}
      />

      {/* App Update & APK CI/CD Modal */}
      <AppUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </div>
  );
}
