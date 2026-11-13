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
  QuadrantConfig,
  BackgroundTone,
  CloudBackupSnapshot,
  PlanningPeriodConfig,
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
  loadQuadrantConfig,
  saveQuadrantConfig,
  loadBackgroundTone,
  saveBackgroundTone,
  loadPlanningPeriod,
  savePlanningPeriod,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  saveUserDataToCloud,
  fetchUserDataFromCloud,
  getStoredUserProfile,
  fetchCloudBackupsList,
  deleteCloudBackupSnapshot,
  syncSingleTaskToCloud,
  deleteSingleTaskFromCloud,
  seedInitialCloudTasksIfEmpty,
  subscribeToCloudTasks,
  syncSettingsToCloud,
  subscribeToCloudSettings,
} from './services/firebase';
import { getBiometricRecord, isVaultLocked, setVaultLocked } from './services/biometrics';
import {
  InAppNotification,
  checkTaskRemindersAndSchedules,
  scheduleTaskOSNotifications,
  requestNotificationPermission,
  soundService,
} from './services/notifications';
import {
  calculateNextOccurrence,
  generateRecurringTaskSeries,
  extendRecurringSeries,
  stopRecurringSeriesAfter,
  RecurrenceCompletionAction,
} from './utils/recurrence';
import { calculateTimeLevel } from './utils/timeColor';
import { detectCollisions } from './utils/collisionUtils';
import { getNextSundayEnd } from './utils/prioritySort';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { GanttView } from './components/GanttView';
import { CalendarView } from './components/CalendarView';
import { HistoryView } from './components/HistoryView';
import { TaskListView } from './components/TaskListView';
import { GlobalDashboardView } from './components/GlobalDashboardView';
import { EisenhowerMatrixView } from './components/EisenhowerMatrixView';
import { QuadrantSettingsModal } from './components/QuadrantSettingsModal';
import { BoardSelectModal } from './components/BoardSelectModal';
import { TaskModal } from './components/TaskModal';
import { ReportsModal } from './components/ReportsModal';
import { SettingsModal } from './components/SettingsModal';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { NotificationsModal } from './components/NotificationsModal';
import { SemaforoFilterModal } from './components/SemaforoFilterModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { WaitingDaysModal } from './components/WaitingDaysModal';
import { CompletionDateModal } from './components/CompletionDateModal';
import { checkGitHubRelease, checkAndCleanupOldApkOnStartup } from './services/updateService';
import { ImportBoardAction } from './types';
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
  Settings2,
  X,
  Grid2x2,
  CalendarRange,
} from 'lucide-react';

export default function App() {
  const deduplicateInitialTasks = (rawList: TaskItem[]): TaskItem[] => {
    const seen = new Set<string>();
    const result: TaskItem[] = [];
    rawList.forEach((t, idx) => {
      if (!t) return;
      let safeId = t.id || `task-${Date.now()}-${idx}`;
      if (seen.has(safeId)) {
        safeId = `${safeId}-dup-${idx}-${Math.random().toString(36).substring(2, 5)}`;
      }
      seen.add(safeId);
      result.push({ ...t, id: safeId });
    });
    return result;
  };

  // Persistence States
  const [tasks, setTasks] = useState<TaskItem[]>(() => deduplicateInitialTasks(loadTasks()));
  const [boards, setBoards] = useState<Board[]>(() => loadBoards());
  const [currentBoardId, setCurrentBoardId] = useState<string>(() => {
    try {
      const savedBoard = localStorage.getItem('chronotask_last_board');
      if (savedBoard) return savedBoard;
    } catch (e) {
      console.error(e);
    }
    return 'master';
  });
  const [types, setTypes] = useState<CustomTypeDefinition[]>(() => loadCustomTypes());
  const [priorities, setPriorities] = useState<CustomPriorityDefinition[]>(() => loadCustomPriorities());
  const [tags, setTags] = useState<CustomTag[]>(() => loadTags());
  const [theme, setTheme] = useState<LightThemeConfig>(() => loadTheme());
  const [bgTone, setBgTone] = useState<BackgroundTone>(() => loadBackgroundTone());
  const [acceptedCollisions, setAcceptedCollisions] = useState<string[]>(() => loadAcceptedCollisions());
  const [planningPeriod, setPlanningPeriod] = useState<PlanningPeriodConfig>(() => loadPlanningPeriod());

  const handleBgToneChange = (tone: BackgroundTone) => {
    setBgTone(tone);
    saveBackgroundTone(tone);
  };

  const handlePlanningPeriodChange = (config: PlanningPeriodConfig) => {
    setPlanningPeriod(config);
    savePlanningPeriod(config);
  };

  // User Auth & Biometrics
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUserProfile());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [biometricRecord, setBiometricRecord] = useState<BiometricRecord>(() => getBiometricRecord());
  const [isLocked, setIsLocked] = useState<boolean>(() => isVaultLocked());

  // Views order requested by user:
  // tablero (modal trigger), kanban, tabla, calendario, gantt, eisenhower, historial (plus global dashboard)
  const [viewMode, setViewMode] = useState<'table' | 'calendar' | 'gantt' | 'eisenhower' | 'history' | 'global'>(() => {
    try {
      const savedView = localStorage.getItem('chronotask_last_view');
      if (
        savedView &&
        ['table', 'calendar', 'gantt', 'eisenhower', 'history', 'global'].includes(savedView)
      ) {
        return savedView as any;
      }
    } catch (e) {
      console.error(e);
    }
    return 'eisenhower';
  });

  // Persist active view & active board to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chronotask_last_board', currentBoardId);
    } catch (e) {
      console.error(e);
    }
  }, [currentBoardId]);

  useEffect(() => {
    try {
      localStorage.setItem('chronotask_last_view', viewMode);
    } catch (e) {
      console.error(e);
    }
  }, [viewMode]);

  // Modals
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('todo');
  const [initialBoardForNewTask, setInitialBoardForNewTask] = useState<string>('');
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quadrantConfig, setQuadrantConfig] = useState<QuadrantConfig>(() => loadQuadrantConfig());
  const [isQuadrantSettingsModalOpen, setIsQuadrantSettingsModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSemaforoModalOpen, setIsSemaforoModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [waitingModalTask, setWaitingModalTask] = useState<TaskItem | null>(null);
  const [completionModalTask, setCompletionModalTask] = useState<TaskItem | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
      (user, token, profile) => {
        if (profile) {
          setCurrentUser(profile);
        } else if (user) {
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            photoURL: user.photoURL || undefined,
          });
        }
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Manual Cloud Sync State & Handlers (Controlled by user to save quota)
  const formatBackupDateDisplay = (isoOrDate?: string | Date | null): string => {
    if (!isoOrDate) return '';
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return String(isoOrDate);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = d.getDate();
    const month = months[d.getMonth()] || '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  };

  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'boards' | 'transfer' | 'planning' | 'types' | 'priorities' | 'tags' | 'theme'
  >('boards');
  const [cloudBackups, setCloudBackups] = useState<CloudBackupSnapshot[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    loading: boolean;
    lastSyncTime: string | null;
    msg: string | null;
    isError?: boolean;
  }>(() => {
    const savedTime = localStorage.getItem('kronotask_last_cloud_sync');
    return {
      loading: false,
      lastSyncTime: savedTime,
      msg: null,
    };
  });

  const loadBackupsList = async () => {
    if (!currentUser) return;
    setIsLoadingBackups(true);
    try {
      const list = await fetchCloudBackupsList(currentUser);
      setCloudBackups(list);
      if (list.length > 0 && list[0]?.createdAt) {
        const lastFormatted = formatBackupDateDisplay(list[0].createdAt);
        localStorage.setItem('kronotask_last_cloud_sync', lastFormatted);
        setCloudSyncStatus((prev) => ({
          ...prev,
          lastSyncTime: lastFormatted,
        }));
      }
    } catch (e) {
      console.warn('Error cargando lista de respaldos:', e);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadBackupsList();
    }
  }, [currentUser]);

  useEffect(() => {
    if (isSettingsOpen && currentUser) {
      loadBackupsList();
    }
  }, [isSettingsOpen, currentUser]);

  // Granular Real-time Cloud Sync State (Only modified elements, lowest quota & battery saver)
  const [realtimeSyncEnabled, setRealtimeSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kronotask_realtime_sync_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'syncing' | 'idle' | 'paused'>('idle');

  const handleToggleRealtimeSync = () => {
    setRealtimeSyncEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('kronotask_realtime_sync_enabled', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!currentUser || !realtimeSyncEnabled) {
      setRealtimeStatus('paused');
      return;
    }

    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;

    const startListening = () => {
      setRealtimeStatus('connected');
      if (!unsubscribeTasks) {
        unsubscribeTasks = subscribeToCloudTasks(currentUser, (changedTasks, removedIds) => {
          setTasks((prev) => {
            let next = [...prev];
            if (removedIds.length > 0) {
              next = next.filter((t) => !removedIds.includes(t.id));
            }
            changedTasks.forEach((incoming) => {
              const idx = next.findIndex((t) => t.id === incoming.id);
              if (idx >= 0) {
                next[idx] = { ...next[idx], ...incoming };
              } else {
                next.unshift(incoming);
              }
            });
            saveTasks(next);
            return next;
          });
        });
      }

      if (!unsubscribeSettings) {
        unsubscribeSettings = subscribeToCloudSettings(currentUser, (cloudSettings) => {
          if (cloudSettings.boards && Array.isArray(cloudSettings.boards) && cloudSettings.boards.length > 0) {
            setBoards(cloudSettings.boards);
            saveBoards(cloudSettings.boards);
          }
          if (cloudSettings.customTypes && Array.isArray(cloudSettings.customTypes)) {
            setTypes(cloudSettings.customTypes);
            saveCustomTypes(cloudSettings.customTypes);
          }
          if (cloudSettings.customPriorities && Array.isArray(cloudSettings.customPriorities)) {
            setPriorities(cloudSettings.customPriorities);
            saveCustomPriorities(cloudSettings.customPriorities);
          }
          if (cloudSettings.tags && Array.isArray(cloudSettings.tags)) {
            setTags(cloudSettings.tags);
            saveTags(cloudSettings.tags);
          }
          if (cloudSettings.theme) {
            setTheme(cloudSettings.theme);
            saveTheme(cloudSettings.theme);
          }
          if (cloudSettings.quadrantConfig) {
            setQuadrantConfig(cloudSettings.quadrantConfig);
            saveQuadrantConfig(cloudSettings.quadrantConfig);
          }
        });
      }
    };

    const stopListening = () => {
      setRealtimeStatus('paused');
      if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
      }
      if (unsubscribeSettings) {
        unsubscribeSettings();
        unsubscribeSettings = null;
      }
    };

    // Seed existing local tasks to the cloud subcollection if currently empty
    seedInitialCloudTasksIfEmpty(currentUser, tasksRef.current);

    // ANDROID / MOBILE BATTERY SAVER:
    // When screen turns off or app is minimized to background, disconnect listener.
    // When app returns to foreground, reconnect and catch up immediately.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopListening();
      } else {
        startListening();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startListening();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopListening();
    };
  }, [currentUser, realtimeSyncEnabled]);

  const handleUploadCloudBackup = async (): Promise<boolean> => {
    if (!currentUser) {
      setCloudSyncStatus({
        loading: false,
        lastSyncTime: null,
        msg: 'Inicia sesión con Google para respaldar en la nube',
        isError: true,
      });
      return false;
    }
    setCloudSyncStatus((prev) => ({ ...prev, loading: true, msg: null }));
    try {
      const updatedList = await saveUserDataToCloud(currentUser, {
        tasks,
        boards,
        tags,
        customTypes: types,
        customPriorities: priorities,
        quadrantConfig,
        theme,
        acceptedCollisions,
        bgTone,
        planningPeriod,
      });
      setCloudBackups(updatedList);
      const nowFormatted = formatBackupDateDisplay(new Date());
      localStorage.setItem('kronotask_last_cloud_sync', nowFormatted);
      setCloudSyncStatus({
        loading: false,
        lastSyncTime: nowFormatted,
        msg: `✓ Respaldo completo guardado (${updatedList.length} de 4 copias)`,
        isError: false,
      });
      return true;
    } catch (e: any) {
      console.error(e);
      setCloudSyncStatus((prev) => ({
        loading: false,
        lastSyncTime: prev.lastSyncTime,
        msg: 'Error al subir respaldo a la nube',
        isError: true,
      }));
      return false;
    }
  };

  const handleRestoreCloudBackup = async (snapshot?: CloudBackupSnapshot): Promise<boolean> => {
    if (!currentUser) {
      setCloudSyncStatus({
        loading: false,
        lastSyncTime: null,
        msg: 'Inicia sesión con Google para restaurar la nube',
        isError: true,
      });
      return false;
    }
    setCloudSyncStatus((prev) => ({ ...prev, loading: true, msg: null }));
    try {
      // Defensively test if snapshot is an actual CloudBackupSnapshot or if an event / undefined was passed
      const isActualSnapshot = Boolean(
        snapshot &&
        typeof snapshot === 'object' &&
        'id' in snapshot &&
        'createdAt' in snapshot &&
        'data' in snapshot &&
        (snapshot as any).data &&
        Array.isArray((snapshot as any).data?.tasks)
      );

      let targetSnapshot = isActualSnapshot ? snapshot : undefined;
      let availableBackups = cloudBackups;

      if (!targetSnapshot) {
        const list = await fetchCloudBackupsList(currentUser);
        setCloudBackups(list);
        availableBackups = list;
        if (list.length > 0) {
          targetSnapshot = list[0];
        }
      }

      if (targetSnapshot && targetSnapshot.data) {
        const data = targetSnapshot.data;

        // PURE FULL OVERWRITE - Exactly what the user requested, NO MERGING
        const restoredTasks = Array.isArray(data.tasks) ? data.tasks : [];
        setTasks(restoredTasks);
        saveTasks(restoredTasks);

        const restoredBoards = Array.isArray(data.boards) && data.boards.length > 0 ? data.boards : boards;
        setBoards(restoredBoards);
        saveBoards(restoredBoards);

        const restoredTags = Array.isArray(data.tags) ? data.tags : [];
        setTags(restoredTags);
        saveTags(restoredTags);

        const restoredTypes = Array.isArray(data.customTypes) && data.customTypes.length > 0 ? data.customTypes : types;
        setTypes(restoredTypes);
        saveCustomTypes(restoredTypes);

        const restoredPriorities = Array.isArray(data.customPriorities) && data.customPriorities.length > 0 ? data.customPriorities : priorities;
        setPriorities(restoredPriorities);
        saveCustomPriorities(restoredPriorities);

        if (data.quadrantConfig) {
          setQuadrantConfig(data.quadrantConfig);
          saveQuadrantConfig(data.quadrantConfig);
        }

        if (data.theme) {
          setTheme(data.theme);
          saveTheme(data.theme);
        }

        if (data.acceptedCollisions && Array.isArray(data.acceptedCollisions)) {
          setAcceptedCollisions(data.acceptedCollisions);
          saveAcceptedCollisions(data.acceptedCollisions);
        }

        if (data.bgTone) {
          setBgTone(data.bgTone);
          saveBackgroundTone(data.bgTone);
        }

        if (data.planningPeriod) {
          setPlanningPeriod(data.planningPeriod);
          savePlanningPeriod(data.planningPeriod);
        }

        const nowFormatted = formatBackupDateDisplay(targetSnapshot.createdAt ? new Date(targetSnapshot.createdAt) : new Date());
        localStorage.setItem('kronotask_last_cloud_sync', nowFormatted);
        setCloudSyncStatus({
          loading: false,
          lastSyncTime: nowFormatted,
          msg: `✓ Copia restaurada: ${restoredTasks.length} tareas sobreescritas (${availableBackups.length} disponibles)`,
          isError: false,
        });
        return true;
      } else {
        setCloudSyncStatus((prev) => ({
          loading: false,
          lastSyncTime: prev.lastSyncTime,
          msg: `Sin copia previa para ${currentUser.email}`,
          isError: true,
        }));
        return false;
      }
    } catch (e: any) {
      console.error(e);
      setCloudSyncStatus((prev) => ({
        loading: false,
        lastSyncTime: prev.lastSyncTime,
        msg: 'Error al restaurar desde la nube',
        isError: true,
      }));
      return false;
    }
  };

  const handleDeleteCloudBackup = async (backupId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const updated = await deleteCloudBackupSnapshot(currentUser, backupId);
      setCloudBackups(updated);
      setCloudSyncStatus((prev) => ({
        ...prev,
        msg: '✓ Respaldo eliminado de la nube',
        isError: false,
      }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Dynamic Theme Styling Effect
  useEffect(() => {
    if (theme) {
      document.documentElement.className = `theme-${theme.id}`;
      const primaryHex =
        theme.primaryColor === 'emerald'
          ? '#059669'
          : theme.primaryColor === 'amber'
          ? '#d97706'
          : theme.primaryColor === 'violet'
          ? '#7c3aed'
          : theme.primaryColor === 'slate'
          ? '#475569'
          : '#2563eb';
      document.documentElement.style.setProperty('--theme-primary-hex', primaryHex);
    }
  }, [theme]);

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

  // Comprobar actualización únicamente al iniciar la app y limpiar APKs de versiones previas
  useEffect(() => {
    let isMounted = true;
    const initAppUpdates = async () => {
      try {
        // Limpia el APK descargado previamente si la versión actual ya está al día
        await checkAndCleanupOldApkOnStartup();

        const info = await checkGitHubRelease();
        if (isMounted && info.hasUpdate) {
          setIsUpdateModalOpen(true);
        }
      } catch (e) {
        // Omisión silenciosa al iniciar si no hay red o aún no hay releases
        console.warn('Verificación de actualización al inicio omitida:', e);
      }
    };

    const timer = setTimeout(() => {
      initAppUpdates();
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const deduplicateTasks = (taskList: TaskItem[]): TaskItem[] => {
    const seen = new Set<string>();
    const result: TaskItem[] = [];
    taskList.forEach((t, idx) => {
      if (!t) return;
      let safeId = t.id || `task-${Date.now()}-${idx}`;
      if (seen.has(safeId)) {
        safeId = `${safeId}-dup-${idx}-${Math.random().toString(36).substring(2, 5)}`;
      }
      seen.add(safeId);
      result.push({ ...t, id: safeId });
    });
    return result;
  };

  const updateTasks = (newTasks: TaskItem[]) => {
    const cleanTasks = deduplicateTasks(newTasks);
    setTasks(cleanTasks);
    saveTasks(cleanTasks);
    scheduleTaskOSNotifications(cleanTasks);
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) setCurrentUser(res.profile);
    } catch (e: any) {
      console.error(e);
      setConfirmModal({
        isOpen: true,
        title: 'Inicio de Sesión',
        message: e.message || 'No se pudo completar el inicio de sesión con Google. Intente nuevamente.',
        confirmText: 'Entendido',
        isDestructive: false,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    try {
      await logout();
    } catch (e) {
      console.warn('Logout safe exception handler:', e);
    } finally {
      setCurrentUser(null);
    }
  };

  const handleTaskStatusChange = (
    taskId: string,
    newStatus: TaskStatus,
    waitingDays?: number,
    completionDate?: string,
    completionOutcome?: 'completed' | 'missed',
    recurrenceAction?: RecurrenceCompletionAction
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Si se pasa a 'waiting' y no se han indicado los días aún, abrimos el modal para indicarlos
    if (newStatus === 'waiting' && task.status !== 'waiting' && waitingDays === undefined) {
      setWaitingModalTask(task);
      return;
    }

    // Si se pasa a 'done' y no viene completionDate especificada, abrimos el modal para indicarla
    if (newStatus === 'done' && !completionDate) {
      setCompletionModalTask(task);
      return;
    }

    let extraTask: TaskItem | null = null;
    if (
      newStatus === 'done' &&
      task.recurrence?.enabled &&
      completionOutcome !== 'missed' &&
      recurrenceAction?.type !== 'extend' &&
      recurrenceAction?.type !== 'finish'
    ) {
      // Si la tarea forma parte de una serie ya pre-generada en el tablero,
      // comprobamos si ya existen ocurrencias futuras para no duplicarlas
      const hasFutureInSeries = task.recurrenceSeriesId
        ? tasks.some((t) => t.recurrenceSeriesId === task.recurrenceSeriesId && t.id !== task.id && t.status !== 'done')
        : false;

      // Solo crear extraTask si no hay ocurrencias futuras ya generadas Y (es modo continuo o sin límite)
      if (!hasFutureInSeries && (task.recurrence.endCondition === 'never' || !task.recurrenceSeriesId)) {
        const { nextStart, nextEnd } = calculateNextOccurrence(task.startDate, task.endDate, task.recurrence);
        extraTask = {
          ...task,
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: task.title,
          status: 'todo',
          startDate: nextStart,
          endDate: nextEnd,
          completedAt: null,
          completionOutcome: null,
          recurrenceIndex: (task.recurrenceIndex || 1) + 1,
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
    }

    let updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        let waitingSince = t.waitingSince;
        let frictionPoints = t.frictionPoints || 0;
        let endDate = t.endDate;
        let currentWaitingDays = t.waitingDays;

        // Historial de Fricción: cada vez que entra a 'waiting' se añaden 5 puntos permanentes
        // y el tiempo en días se suma directamente a la fecha de fin de la tarea
        if (newStatus === 'waiting' && t.status !== 'waiting') {
          frictionPoints += 5;
          const daysToAdd = Math.max(1, isNaN(waitingDays as number) ? 2 : (waitingDays as number));
          currentWaitingDays = daysToAdd;
          const currentEndMs = new Date(t.endDate).getTime();
          endDate = new Date(currentEndMs + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
        }

        if (newStatus === 'waiting' && !waitingSince) {
          waitingSince = new Date().toISOString();
        } else if (newStatus !== 'waiting') {
          waitingSince = null;
        }

        const updatedRecurrence =
          newStatus === 'done' && recurrenceAction?.type === 'finish' && t.recurrence
            ? {
                ...t.recurrence,
                endCondition: (t.recurrence.endCondition === 'never' ? 'count' : t.recurrence.endCondition) as 'until_date' | 'count' | 'never',
                repeatCount: t.recurrenceIndex || 1,
              }
            : t.recurrence;

        return {
          ...t,
          status: newStatus,
          waitingSince,
          waitingDays: currentWaitingDays,
          endDate,
          frictionPoints,
          recurrence: updatedRecurrence,
          completedAt: newStatus === 'done' ? (completionDate || new Date().toISOString()) : null,
          completionOutcome: newStatus === 'done' ? (completionOutcome || 'completed') : null,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    const closedTask = updatedTasks.find((t) => t.id === taskId);

    if (newStatus === 'done' && closedTask && recurrenceAction?.type === 'extend') {
      const { updatedExistingTasks, newlyCreatedTasks, newTotal } = extendRecurringSeries(
        updatedTasks,
        closedTask,
        recurrenceAction.extraCycles
      );
      const updatedMap = new Map(updatedExistingTasks.map((t) => [t.id, t]));
      updatedTasks = [
        ...newlyCreatedTasks,
        ...updatedTasks.map((t) => updatedMap.get(t.id) || t),
      ];
      setInAppNotifications((prev) => [
        ...prev,
        {
          id: `notif-ext-${Date.now()}`,
          title: 'Periodicidad Extendida',
          body: `Se agregaron ${newlyCreatedTasks.length} ciclos nuevos a "${task.title}" (Total: ${newTotal} ciclos).`,
          type: 'info',
          timestamp: new Date().toISOString(),
          taskId: newlyCreatedTasks[0]?.id,
        },
      ]);
      updateTasks(updatedTasks);
      if (currentUser && realtimeSyncEnabled) {
        updatedExistingTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
        newlyCreatedTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
      }
      return;
    }

    if (newStatus === 'done' && closedTask && recurrenceAction?.type === 'finish') {
      const { updatedRemainingTasks, removedTaskIds } = stopRecurringSeriesAfter(
        updatedTasks,
        closedTask
      );
      const removedSet = new Set(removedTaskIds);
      const remainingMap = new Map(updatedRemainingTasks.map((t) => [t.id, t]));
      updatedTasks = updatedTasks
        .filter((t) => !removedSet.has(t.id))
        .map((t) => remainingMap.get(t.id) || t);

      setInAppNotifications((prev) => [
        ...prev,
        {
          id: `notif-stop-${Date.now()}`,
          title: 'Seguimiento Periódico Finalizado',
          body:
            removedTaskIds.length > 0
              ? `Se cerró "${task.title}" y se eliminaron ${removedTaskIds.length} ciclos futuros pendientes.`
              : `Se cerró "${task.title}" y se detuvo la generación de nuevos ciclos.`,
          type: 'info',
          timestamp: new Date().toISOString(),
          taskId: closedTask.id,
        },
      ]);
      updateTasks(updatedTasks);
      if (currentUser && realtimeSyncEnabled) {
        updatedRemainingTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
        removedTaskIds.forEach((id) => deleteSingleTaskFromCloud(currentUser, id));
      }
      return;
    }

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

    // Fine-grained Realtime Cloud Sync: sync only the modified task & any recurring cycle
    if (currentUser && realtimeSyncEnabled) {
      const changed = updatedTasks.find((t) => t.id === taskId);
      if (changed) syncSingleTaskToCloud(currentUser, changed);
      if (extraTask) syncSingleTaskToCloud(currentUser, extraTask);
    }
  };

  const handleExtendSeries = (referenceTask: TaskItem, extraCycles: number) => {
    const { updatedExistingTasks, newlyCreatedTasks, newTotal } = extendRecurringSeries(
      tasks,
      referenceTask,
      extraCycles
    );
    const updatedMap = new Map(updatedExistingTasks.map((t) => [t.id, t]));
    const nextTasks = [
      ...newlyCreatedTasks,
      ...tasks.map((t) => updatedMap.get(t.id) || t),
    ];
    updateTasks(nextTasks);

    setInAppNotifications((prev) => [
      ...prev,
      {
        id: `notif-ext-modal-${Date.now()}`,
        title: 'Periodicidad Extendida',
        body: `Se agregaron ${newlyCreatedTasks.length} ciclos nuevos a "${referenceTask.title}" (Total: ${newTotal}).`,
        type: 'info',
        timestamp: new Date().toISOString(),
        taskId: newlyCreatedTasks[0]?.id,
      },
    ]);

    if (currentUser && realtimeSyncEnabled) {
      updatedExistingTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
      newlyCreatedTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
    }
  };

  const handleStopSeriesAfter = (referenceTask: TaskItem) => {
    const { updatedRemainingTasks, removedTaskIds } = stopRecurringSeriesAfter(
      tasks,
      referenceTask
    );
    const removedSet = new Set(removedTaskIds);
    const remainingMap = new Map(updatedRemainingTasks.map((t) => [t.id, t]));
    const nextTasks = tasks
      .filter((t) => !removedSet.has(t.id))
      .map((t) => remainingMap.get(t.id) || t);

    updateTasks(nextTasks);

    setInAppNotifications((prev) => [
      ...prev,
      {
        id: `notif-stop-modal-${Date.now()}`,
        title: 'Seguimiento Periódico Finalizado',
        body:
          removedTaskIds.length > 0
            ? `Se eliminaron ${removedTaskIds.length} ciclos futuros pendientes de "${referenceTask.title}".`
            : `Se detuvo el seguimiento futuro de "${referenceTask.title}".`,
        type: 'info',
        timestamp: new Date().toISOString(),
        taskId: referenceTask.id,
      },
    ]);

    if (currentUser && realtimeSyncEnabled) {
      updatedRemainingTasks.forEach((t) => syncSingleTaskToCloud(currentUser, t));
      removedTaskIds.forEach((id) => deleteSingleTaskFromCloud(currentUser, id));
    }
  };

  const handleSaveTask = (taskToSave: TaskItem, options?: { editScope?: 'single' | 'series' }) => {
    const editScope = options?.editScope || 'series';
    const originalTask = tasks.find((t) => t.id === taskToSave.id);
    const exists = Boolean(originalTask);

    // Si la tarea tiene periodicidad habilitada y está activo el flag para generar tareas en el tablero
    if (taskToSave.recurrence?.enabled && taskToSave.recurrence.generateInstances !== false) {
      if (!exists || editScope === 'series' || !taskToSave.recurrenceSeriesId) {
        const seriesId = taskToSave.recurrenceSeriesId || `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const existingSeriesTasks = tasks.filter((t) => t.recurrenceSeriesId === seriesId);

        // Si se edita la serie desde un ciclo posterior al 1 sin cambiar sus fechas manualmente,
        // anclamos la generación en el ciclo 1 original para conservar las fechas previas de la serie.
        let anchorBaseTask: TaskItem = {
          ...taskToSave,
          recurrenceSeriesId: seriesId,
        };
        if (
          originalTask &&
          originalTask.recurrenceIndex &&
          originalTask.recurrenceIndex > 1 &&
          originalTask.startDate === taskToSave.startDate &&
          originalTask.endDate === taskToSave.endDate &&
          existingSeriesTasks.length > 1
        ) {
          const firstCycle = [...existingSeriesTasks].sort(
            (a, b) => (a.recurrenceIndex || 1) - (b.recurrenceIndex || 1)
          )[0];
          if (firstCycle) {
            anchorBaseTask = {
              ...taskToSave,
              id: firstCycle.id,
              status: firstCycle.status,
              completedAt: firstCycle.completedAt,
              startDate: firstCycle.startDate,
              endDate: firstCycle.endDate,
              recurrenceSeriesId: seriesId,
              recurrenceIndex: firstCycle.recurrenceIndex || 1,
              createdAt: firstCycle.createdAt,
            };
          }
        }

        const generatedSeries = generateRecurringTaskSeries(anchorBaseTask, { seriesId });

        if (exists || taskToSave.recurrenceSeriesId) {
          // Mantener tareas completadas anteriores de esta serie para no alterar su historial
          const otherTasks = tasks.filter((t) => t.recurrenceSeriesId !== seriesId && t.id !== taskToSave.id);
          const completedFromSeries = tasks
            .filter((t) => t.recurrenceSeriesId === seriesId && t.status === 'done')
            .map((c) => ({
              ...c,
              recurrenceTotal: generatedSeries.length,
              recurrence: c.recurrence
                ? { ...c.recurrence, repeatCount: generatedSeries.length }
                : taskToSave.recurrence,
            }));
          const pendingGenerated = generatedSeries.filter(
            (gen) => !completedFromSeries.some((c) => c.recurrenceIndex === gen.recurrenceIndex)
          ).map((gen) =>
            gen.recurrenceIndex === taskToSave.recurrenceIndex
              ? { ...gen, id: taskToSave.id, status: taskToSave.status, completedAt: taskToSave.completedAt }
              : gen
          );

          const keepIds = new Set([
            ...completedFromSeries.map((c) => c.id),
            ...pendingGenerated.map((p) => p.id),
          ]);
          const removedFromSeries = existingSeriesTasks.filter((t) => !keepIds.has(t.id));

          const updated = [...completedFromSeries, ...pendingGenerated, ...otherTasks];
          updateTasks(updated);
          if (currentUser && realtimeSyncEnabled) {
            completedFromSeries.forEach((c) => syncSingleTaskToCloud(currentUser, c));
            pendingGenerated.forEach((gen) => syncSingleTaskToCloud(currentUser, gen));
            removedFromSeries.forEach((rem) => deleteSingleTaskFromCloud(currentUser, rem.id));
          }
          return;
        } else {
          // Nueva tarea periódica: se crean todas las tareas hasta la fecha límite
          const updated = [...generatedSeries, ...tasks];
          updateTasks(updated);
          if (currentUser && realtimeSyncEnabled) {
            generatedSeries.forEach((gen) => syncSingleTaskToCloud(currentUser, gen));
          }
          return;
        }
      }
    }

    // Guardado normal de tarea única o edición solo de esta ocurrencia
    let updated: TaskItem[];
    if (exists) {
      updated = tasks.map((t) => (t.id === taskToSave.id ? taskToSave : t));
    } else {
      updated = [taskToSave, ...tasks];
    }
    updateTasks(updated);

    // Fine-grained Realtime Cloud Sync: sync only the single saved task
    if (currentUser && realtimeSyncEnabled) {
      syncSingleTaskToCloud(currentUser, taskToSave);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    const seriesId = taskToDelete?.recurrenceSeriesId;
    const seriesTasks = seriesId ? tasks.filter((t) => t.recurrenceSeriesId === seriesId) : [];

    if (seriesId && seriesTasks.length > 1) {
      setConfirmModal({
        isOpen: true,
        title: 'Eliminar Tarea Periódica',
        message: `Esta tarea forma parte de una serie de ${seriesTasks.length} repeticiones. ¿Deseas eliminar solo esta ocurrencia o toda la serie?`,
        confirmText: 'Eliminar toda la serie',
        cancelText: 'Solo esta ocurrencia',
        isDestructive: true,
        onConfirm: () => {
          const updated = tasks.filter((t) => t.recurrenceSeriesId !== seriesId);
          updateTasks(updated);
          if (currentUser && realtimeSyncEnabled) {
            seriesTasks.forEach((st) => deleteSingleTaskFromCloud(currentUser, st.id));
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          const updated = tasks.filter((t) => t.id !== taskId);
          updateTasks(updated);
          if (currentUser && realtimeSyncEnabled) {
            deleteSingleTaskFromCloud(currentUser, taskId);
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea permanentemente?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        const updated = tasks.filter((t) => t.id !== taskId);
        updateTasks(updated);
        if (currentUser && realtimeSyncEnabled) {
          deleteSingleTaskFromCloud(currentUser, taskId);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Boards Management
  const handleAddBoard = (name: string, description: string, color: string, includeInMaster: boolean = true) => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name,
      description,
      color,
      includeInMaster,
      createdAt: new Date().toISOString(),
    };
    const updated = [...boards, newBoard];
    setBoards(updated);
    saveBoards(updated);
    setCurrentBoardId(newBoard.id);
  };

  const handleUpdateBoard = (boardId: string, name: string, description: string, color: string, includeInMaster: boolean = true) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = boards.map((b) =>
      b.id === boardId ? { ...b, name: trimmed, description: description.trim(), color, includeInMaster } : b
    );
    setBoards(updated);
    saveBoards(updated);
  };

  const handleDeleteBoard = (boardId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Tablero',
      message: '¿Estás seguro de que deseas eliminar este tablero y todas sus tareas asociadas?',
      confirmText: 'Eliminar Tablero',
      isDestructive: true,
      onConfirm: () => {
        const updated = boards.filter((b) => b.id !== boardId);
        setBoards(updated);
        saveBoards(updated);
        if (currentBoardId === boardId && updated.length > 0) {
          setCurrentBoardId(updated[0].id);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Base64 Import Board Action (supports overwrite, merge with suffix, or create new board)
  const handleImportBoardAction = (action: ImportBoardAction) => {
    if (action.mode === 'overwrite') {
      const targetBoard =
        boards.find(
          (b) => b.id === action.targetBoardId || b.name.toLowerCase() === action.board.name.toLowerCase()
        ) || boards[0];
      const targetId = targetBoard.id;

      // Filter out previous tasks of this board
      const remainingTasks = tasks.filter(
        (t) => t.boardId !== targetId && (t.boardId || targetId !== 'board-work')
      );

      // Reassign imported tasks to target board with fresh unique IDs
      const imported = action.tasks.map((t, idx) => ({
        ...t,
        id: `task-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        boardId: targetId,
        updatedAt: new Date().toISOString(),
      }));

      const finalTasks = [...remainingTasks, ...imported];
      updateTasks(finalTasks);
      setCurrentBoardId(targetId);

      setConfirmModal({
        isOpen: true,
        title: 'Importación Exitosa',
        message: `El tablero "${targetBoard.name}" fue sobrescrito con éxito. Se cargaron ${imported.length} tareas.`,
        confirmText: 'Aceptar',
        isDestructive: false,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    } else if (action.mode === 'merge') {
      const targetBoard =
        boards.find(
          (b) => b.id === action.targetBoardId || b.name.toLowerCase() === action.board.name.toLowerCase()
        ) || boards[0];
      const targetId = targetBoard.id;
      const suffix = action.suffix || ' (Importado)';

      const mergedTasks = action.tasks.map((t, idx) => ({
        ...t,
        id: `task-merge-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        boardId: targetId,
        title: `${t.title}${suffix}`,
        updatedAt: new Date().toISOString(),
      }));

      const finalTasks = [...tasks, ...mergedTasks];
      updateTasks(finalTasks);
      setCurrentBoardId(targetId);

      setConfirmModal({
        isOpen: true,
        title: 'Importación Exitosa',
        message: `Se combinaron ${mergedTasks.length} tareas con el sufijo "${suffix}" dentro del tablero "${targetBoard.name}".`,
        confirmText: 'Aceptar',
        isDestructive: false,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    } else {
      // mode === 'new_board'
      const newBoardId = `board-${Date.now()}`;
      const newBoard: Board = {
        id: newBoardId,
        name: action.newBoardName?.trim() || `${action.board.name} (Importado)`,
        description: action.board.description || 'Tablero importado vía Base64',
        color: action.board.color || '#4f46e5',
        createdAt: new Date().toISOString(),
      };

      const importedTasks = action.tasks.map((t, idx) => ({
        ...t,
        id: `task-newb-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        boardId: newBoardId,
        updatedAt: new Date().toISOString(),
      }));

      const updatedBoards = [...boards, newBoard];
      setBoards(updatedBoards);
      saveBoards(updatedBoards);

      const finalTasks = [...tasks, ...importedTasks];
      updateTasks(finalTasks);
      setCurrentBoardId(newBoardId);

      setConfirmModal({
        isOpen: true,
        title: 'Nuevo Tablero Creado',
        message: `Se creó el nuevo tablero "${newBoard.name}" con ${importedTasks.length} tareas importadas.`,
        confirmText: 'Ir al Tablero',
        isDestructive: false,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
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
    let movedTask: TaskItem | null = null;
    const updated = tasks.map((t) => {
      if (t.id === taskIdToMove) {
        movedTask = {
          ...t,
          startDate: newStartIso,
          endDate: newEndIso,
          updatedAt: new Date().toISOString(),
        };
        return movedTask;
      }
      return t;
    });
    updateTasks(updated);
    if (currentUser && realtimeSyncEnabled && movedTask) {
      syncSingleTaskToCloud(currentUser, movedTask);
    }
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

  const isTaskInPlanningPeriod = (t: TaskItem, plan: PlanningPeriodConfig): boolean => {
    if (!plan.enabled || !plan.startDate || !plan.endDate) return true;
    const taskStartMs = new Date(t.startDate).getTime();
    const planStartMs = new Date(plan.startDate).getTime();
    const planEndMs = new Date(plan.endDate).getTime();

    // 1. Tarea iniciada dentro del período del plan actual
    if (taskStartMs >= planStartMs && taskStartMs <= planEndMs) return true;

    // 2. Tarea de plan anterior que aún continúa activa (regla de arrastre inteligente)
    if (taskStartMs < planStartMs && t.status !== 'done') return true;

    return false;
  };

  const rawBoardTasks = isMasterBoard
    ? tasks.filter((t) => {
        const b = boards.find((board) => board.id === t.boardId);
        return !b || b.includeInMaster !== false;
      })
    : tasks.filter((t) => t.boardId === currentBoard.id || (!t.boardId && currentBoard.id === 'board-work'));

  const boardTasks = rawBoardTasks.filter((t) => isTaskInPlanningPeriod(t, planningPeriod));

  // Separate active vs completed (sorted strictly by closest deadline / fecha fin más cercana)
  const activeTasks = boardTasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
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

  const appBgClass =
    bgTone === 'cream'
      ? 'bg-[#f6f5f0]'
      : bgTone === 'gray'
      ? 'bg-[#eef0f3]'
      : (theme?.accentBg || 'bg-slate-50');

  return (
    <div className={`min-h-screen ${appBgClass} text-slate-800 flex flex-col font-sans pb-20 md:pb-6 select-text transition-colors duration-200`}>
      {/* Clean Uncluttered Header */}
      <Header
        currentUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenSettings={(tab) => {
          setSettingsInitialTab((tab as any) || 'boards');
          setIsSettingsOpen(true);
        }}
        onOpenUpdates={() => setIsUpdateModalOpen(true)}
        onOpenGlobalDashboard={() => setViewMode('global')}
        isGlobalDashboardActive={viewMode === 'global'}
        collisionCount={collisionCount}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        notificationCount={inAppNotifications.length}
        onOpenBoardSelect={() => setIsBoardModalOpen(true)}
        currentBoardName={isMasterBoard ? 'Tablero Master' : currentBoard.name}
        currentTheme={theme}
        bgTone={bgTone}
        onUploadCloudBackup={handleUploadCloudBackup}
        onRestoreCloudBackup={handleRestoreCloudBackup}
        cloudSyncStatus={cloudSyncStatus}
        cloudBackups={cloudBackups}
        realtimeSyncEnabled={realtimeSyncEnabled}
        onToggleRealtimeSync={handleToggleRealtimeSync}
        realtimeStatus={realtimeStatus}
      />

      {/* Main Single-Scroll Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3">
        {/* Active Planning Period Pill / Banner */}
        {planningPeriod.enabled && planningPeriod.startDate && (
          <div className="bg-sky-50/90 border border-sky-200/90 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-sky-600 text-white rounded-lg shrink-0 shadow-2xs">
                <CalendarRange className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sky-950">
                    {planningPeriod.name || 'Planificación Actual'}
                  </span>
                  <span className="text-[11px] text-sky-700 font-medium">
                    ({new Date(planningPeriod.startDate).toLocaleDateString()} - {new Date(planningPeriod.endDate).toLocaleDateString()})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300/80">
                    {boardTasks.length} tareas ({boardTasks.filter((t) => new Date(t.startDate).getTime() < new Date(planningPeriod.startDate).getTime() && t.status !== 'done').length} arrastradas de planes previos)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSettingsInitialTab('planning');
                  setIsSettingsOpen(true);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100/70 rounded-lg transition-colors cursor-pointer"
              >
                Ajustar Plan
              </button>
              <button
                type="button"
                onClick={() => handlePlanningPeriodChange({ ...planningPeriod, enabled: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                title="Pausar filtro de plan (ver todas las tareas)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Desktop Views Switcher: Eisenhower, Gantt, Tabla, Calendario, Historial */}
          <div className="hidden md:flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('eisenhower')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                viewMode === 'eisenhower' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <Grid2x2 className="w-3.5 h-3.5" />
              <span>Eisenhower 3x3</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'gantt' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gantt</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                viewMode === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {completedTasks.length}
              </span>
            </button>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex items-center justify-between gap-2 w-full md:w-auto">
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
                  : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filtrar por color de semáforo"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] hidden sm:inline">Semáforo</span>
              {filterColor !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Gear Button for Range Settings (Ajustar Rangos Q1 a Q9) */}
            <button
              type="button"
              onClick={() => setIsQuadrantSettingsModalOpen(true)}
              className="p-2 rounded-xl border border-slate-200 bg-white/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-2xs"
              title="Ajustar Rangos de Q1 a Q9"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* View Component Rendering */}

        {viewMode === 'table' && (
          <TaskListView
            tasks={filteredActiveTasks}
            allTags={tags}
            allBoards={boards}
            allPriorities={priorities}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleTaskStatusChange}
            bgTone={bgTone}
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
            allPriorities={priorities}
            isMasterView={isMasterBoard}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {viewMode === 'eisenhower' && (
          <EisenhowerMatrixView
            tasks={filteredActiveTasks}
            allTags={tags}
            allBoards={boards}
            allPriorities={priorities}
            quadrantConfig={quadrantConfig}
            bgTone={bgTone}
            isMasterView={isMasterBoard}
            searchQuery={searchQuery}
            filterPriority={filterPriority}
            filterType={filterType}
            filterTag={filterTag}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
            onStatusChange={handleTaskStatusChange}
            onAddTaskToQuadrant={(quadrant) => {
              const targetBoard = currentBoardId === 'master' ? (boards[0]?.id || 'board-work') : currentBoardId;
              setSelectedTask(null);
              setInitialStatusForNewTask('todo');
              setInitialBoardForNewTask(targetBoard);
              setIsTaskModalOpen(true);
            }}
            onOpenQuadrantSettings={() => setIsQuadrantSettingsModalOpen(true)}
            onReclassifyTask={(taskId, targetQuadrant) => {
              const now = Date.now();
              const updated = tasks.map((t) => {
                if (t.id !== taskId) return t;
                let newPriority = t.priority;
                let newStatus: TaskStatus = t.status;
                let start = new Date(t.startDate).getTime();
                let end = new Date(t.endDate).getTime();
                let totalDuration = Math.max(1000 * 60 * 30, end - start);

                if (typeof targetQuadrant === 'string' && targetQuadrant.includes('_')) {
                  const [pLevel, uLevel] = targetQuadrant.split('_');
                  if (pLevel === 'high') newPriority = 'critica';
                  else if (pLevel === 'med') newPriority = 'media';
                  else if (pLevel === 'low') newPriority = 'baja';

                  if (uLevel === 'high') {
                    // Set end date so ~80% of task window has elapsed
                    end = now + Math.max(1000 * 60 * 15, Math.floor(totalDuration * 0.2));
                  } else if (uLevel === 'med' || uLevel === 'medium') {
                    // Set end date so ~60% elapsed
                    end = now + Math.max(1000 * 60 * 60, Math.floor(totalDuration * 0.4));
                  } else if (uLevel === 'low') {
                    // Set end date so ~30% elapsed (plazo holgado)
                    end = now + Math.max(1000 * 60 * 60 * 24, Math.floor(totalDuration * 0.7));
                  }
                } else {
                  const qNum = typeof targetQuadrant === 'string' && targetQuadrant.startsWith('q')
                    ? parseInt(targetQuadrant.slice(1), 10)
                    : Number(targetQuadrant);
                  const nextSunEnd = getNextSundayEnd(now);
                  const msDay = 1000 * 60 * 60 * 24;

                  if (qNum === 1) {
                    newPriority = 'critica';
                    start = now - msDay;
                    end = now + msDay * 2; // < 4 días
                    if (newStatus === 'todo') newStatus = 'in_progress';
                  } else if (qNum === 2) {
                    newPriority = 'alta';
                    start = now - msDay;
                    end = nextSunEnd - 1000 * 60 * 60 * 12; // Termina antes del siguiente domingo -> Q2
                    if (newStatus === 'todo') newStatus = 'in_progress';
                  } else if (qNum === 3) {
                    newPriority = 'alta';
                    start = now - msDay;
                    end = nextSunEnd + msDay * 7; // Termina en 15 días post-domingo -> Q3
                    if (newStatus === 'todo') newStatus = 'in_progress';
                  } else if (qNum === 4) {
                    newPriority = 'media';
                    start = now - msDay;
                    end = nextSunEnd + msDay * 20; // Termina en 15-30d post-domingo -> Q4
                    if (newStatus === 'todo') newStatus = 'in_progress';
                  } else if (qNum === 5) {
                    newPriority = 'media';
                    start = now - msDay;
                    end = nextSunEnd + msDay * 40; // Termina +30d post-domingo -> Q5
                    if (newStatus === 'todo') newStatus = 'in_progress';
                  } else if (qNum === 6) {
                    newPriority = 'baja';
                    start = nextSunEnd - msDay * 2; // Inicia antes del siguiente domingo -> Q6
                    end = nextSunEnd + msDay * 10;
                    newStatus = 'todo';
                  } else if (qNum === 7) {
                    newPriority = 'media';
                    start = nextSunEnd + msDay * 5; // Inicia hasta 15d post-domingo -> Q7
                    end = nextSunEnd + msDay * 25;
                    newStatus = 'todo';
                  } else if (qNum === 8) {
                    newPriority = 'media';
                    start = nextSunEnd + msDay * 20; // Inicia en 15 a 30d post-domingo -> Q8
                    end = nextSunEnd + msDay * 50;
                    newStatus = 'todo';
                  } else if (qNum === 9) {
                    newPriority = 'baja';
                    start = nextSunEnd + msDay * 40; // Inicia +30d post-domingo -> Q9
                    end = nextSunEnd + msDay * 80;
                    newStatus = 'todo';
                  }
                }

                return {
                  ...t,
                  status: newStatus,
                  priority: newPriority,
                  startDate: new Date(start).toISOString(),
                  endDate: new Date(end).toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              });
              updateTasks(updated);
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
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${
        bgTone === 'cream'
          ? 'bg-[#f7f6f2]/95 border-[#e5e3da]'
          : bgTone === 'gray'
          ? 'bg-[#eef0f3]/95 border-[#d8dde3]'
          : 'bg-white/95 border-slate-200'
      } backdrop-blur-md border-t px-2 py-1.5 flex items-center justify-around shadow-lg`}>
        {/* Matriz Eisenhower */}
        <button
          type="button"
          onClick={() => setViewMode('eisenhower')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            viewMode === 'eisenhower' ? 'text-indigo-600 font-black bg-indigo-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Grid2x2 className="w-4 h-4" />
          <span>Matriz</span>
        </button>

        {/* Gantt */}
        <button
          type="button"
          onClick={() => setViewMode('gantt')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            viewMode === 'gantt' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Gantt</span>
        </button>

        {/* Tabla */}
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            viewMode === 'table' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Tabla</span>
        </button>

        {/* Kanban */}


        {/* Calendario */}
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            viewMode === 'calendar' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendario</span>
        </button>

        {/* Historial / Completadas */}
        <button
          type="button"
          onClick={() => setViewMode('history')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all relative ${
            viewMode === 'history' ? 'text-blue-600 font-black bg-blue-50/80 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
          }`}
          title="Ver tareas completadas e historial"
        >
          <History className="w-4 h-4" />
          <span>Completadas</span>
          {completedTasks.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-2xs">
              {completedTasks.length}
            </span>
          )}
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
        onUpdateBoard={handleUpdateBoard}
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
        onExtendSeries={handleExtendSeries}
        onStopSeriesAfter={handleStopSeriesAfter}
      />

      {/* Reports Modal */}
      <ReportsModal
        isOpen={isReportsOpen}
        tasks={boardTasks}
        onClose={() => setIsReportsOpen(false)}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setIsTaskModalOpen(true);
        }}
      />

      {/* Settings Modal (with Biometrics, Planning and Semáforo inside) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        boards={boards}
        onAddBoard={handleAddBoard}
        onUpdateBoard={handleUpdateBoard}
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
        allTasks={tasks}
        onImportBoard={handleImportBoardAction}
        onUploadCloudBackup={handleUploadCloudBackup}
        onRestoreCloudBackup={handleRestoreCloudBackup}
        cloudBackups={cloudBackups}
        isLoadingBackups={isLoadingBackups}
        onRefreshCloudBackups={loadBackupsList}
        onDeleteCloudBackup={handleDeleteCloudBackup}
        cloudSyncStatus={cloudSyncStatus}
        bgTone={bgTone}
        onBgToneChange={handleBgToneChange}
        planningPeriod={planningPeriod}
        onPlanningPeriodChange={handlePlanningPeriodChange}
        initialTab={settingsInitialTab}
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

      {/* Global Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          if (confirmModal.onCancel) {
            confirmModal.onCancel();
          } else {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />

      {/* Quadrant Settings Modal (Ajuste de días Q1-Q9) */}
      <QuadrantSettingsModal
        isOpen={isQuadrantSettingsModalOpen}
        config={quadrantConfig}
        onClose={() => setIsQuadrantSettingsModalOpen(false)}
        onSave={(newCfg) => {
          setQuadrantConfig(newCfg);
          saveQuadrantConfig(newCfg);
        }}
      />

      {/* Waiting Days Modal (agrega días a fecha de fin y registra fricción) */}
      <WaitingDaysModal
        isOpen={Boolean(waitingModalTask)}
        task={waitingModalTask}
        onClose={() => setWaitingModalTask(null)}
        onConfirm={(days) => {
          if (waitingModalTask) {
            const taskId = waitingModalTask.id;
            setWaitingModalTask(null);
            handleTaskStatusChange(taskId, 'waiting', days);
          }
        }}
      />

      {/* Completion Date Modal (indica fecha y hora de cierre real) */}
      <CompletionDateModal
        isOpen={Boolean(completionModalTask)}
        task={completionModalTask}
        allTasks={tasks}
        onClose={() => setCompletionModalTask(null)}
        onConfirm={(completedAtIso, outcome, recurrenceAction) => {
          if (completionModalTask) {
            const taskId = completionModalTask.id;
            setCompletionModalTask(null);
            handleTaskStatusChange(taskId, 'done', undefined, completedAtIso, outcome, recurrenceAction);
          }
        }}
      />
    </div>
  );
}
