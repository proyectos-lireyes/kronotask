import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TaskItem,
  TaskStatus,
  CustomTag,
  RecurrenceUnit,
  TaskAttachment,
  TaskComment,
  UserProfile,
  Board,
  CustomTypeDefinition,
  CustomPriorityDefinition,
} from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { calculateAllOccurrences, getFuturePendingSeriesTasks } from '../utils/recurrence';
import { ConfirmationModal } from './ConfirmationModal';
import { checkTaskCollisionWithExisting } from '../utils/collisionUtils';
import { OptionPickerModal } from './OptionPickerModal';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Tag,
  Paperclip,
  MessageSquare,
  Send,
  Trash2,
  Plus,
  FolderKanban,
  FileText,
  Check,
  ChevronDown,
  Flag,
  PlusCircle,
  StopCircle,
  Layers,
} from 'lucide-react';

const MICROTASK_HOURS_KEY = 'chronotask_microtask_hours';

function loadSavedMicroHours(): number {
  try {
    const raw = localStorage.getItem(MICROTASK_HOURS_KEY);
    if (!raw) return 2;
    const parsed = parseFloat(raw);
    return !isNaN(parsed) && parsed >= 0.5 && parsed <= 12 ? parsed : 2;
  } catch {
    return 2;
  }
}

function saveMicroHours(hours: number) {
  try {
    localStorage.setItem(MICROTASK_HOURS_KEY, String(hours));
  } catch {
    // ignore storage quota errors
  }
}

interface TaskModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  initialStatus?: TaskStatus;
  initialBoardId?: string;
  currentBoardId: string;
  allBoards: Board[];
  allTypes: CustomTypeDefinition[];
  allPriorities: CustomPriorityDefinition[];
  allTags: CustomTag[];
  currentUser: UserProfile | null;
  allTasks?: TaskItem[];
  acceptedCollisions?: string[];
  onAcceptCollision?: (pairKey: string) => void;
  onClose: () => void;
  onSave: (task: TaskItem, options?: { editScope?: 'single' | 'series' }) => void;
  onDelete: (taskId: string) => void;
  onAddTag: (name: string, color: string) => void;
  onExtendSeries?: (task: TaskItem, extraCycles: number) => void;
  onStopSeriesAfter?: (task: TaskItem) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  task,
  initialStatus = 'todo',
  initialBoardId,
  currentBoardId,
  allBoards,
  allTypes,
  allPriorities,
  allTags,
  currentUser,
  allTasks = [],
  acceptedCollisions = [],
  onAcceptCollision,
  onClose,
  onSave,
  onDelete,
  onAddTag,
  onExtendSeries,
  onStopSeriesAfter,
}) => {
  const isEditing = Boolean(task);

  // Form states
  const [boardId, setBoardId] = useState(currentBoardId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<string>('media');
  const [type, setType] = useState<string>('tarea');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endMode, setEndMode] = useState<'date' | 'duration'>('date');
  const [durationValue, setDurationValue] = useState<number>(2);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'>('hours');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [acceptedLocally, setAcceptedLocally] = useState<string[]>([]);

  // Recurrence & Microtask effective dedication
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('days');
  const [recurrenceWeekDays, setRecurrenceWeekDays] = useState<number[]>([]);
  const [recurrenceEndCondition, setRecurrenceEndCondition] = useState<'until_date' | 'count' | 'never'>('until_date');
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState<string>('');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(6);
  const [generateInstances, setGenerateInstances] = useState<boolean>(true);
  const [seriesEditScope, setSeriesEditScope] = useState<'single' | 'series'>('series');
  const [quickExtendCycles, setQuickExtendCycles] = useState<number>(3);
  const [microSessionHours, setMicroSessionHours] = useState<number>(() => loadSavedMicroHours());
  const [recurrenceTouchedManually, setRecurrenceTouchedManually] = useState<boolean>(false);
  const [untilDateTouchedManually, setUntilDateTouchedManually] = useState<boolean>(false);
  const prevOverTwoDaysRef = useRef<boolean>(false);

  // Reminders
  const [reminders, setReminders] = useState<{ id: string; offsetMinutes: number; label: string }[]>([]);
  const [newReminderMinutes, setNewReminderMinutes] = useState(30);

  // Attachments & Comments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // New tag state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    action: () => {},
  });

  // Custom Modal Pickers (replacing default <select>)
  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);
  const [isPriorityPickerOpen, setIsPriorityPickerOpen] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [isDurationPickerOpen, setIsDurationPickerOpen] = useState(false);
  const [isRecurrenceUnitPickerOpen, setIsRecurrenceUnitPickerOpen] = useState(false);
  const [isRecurrenceShortcutPickerOpen, setIsRecurrenceShortcutPickerOpen] = useState(false);
  const [isReminderPickerOpen, setIsReminderPickerOpen] = useState(false);

  const [recurrenceUnitMode, setRecurrenceUnitMode] = useState<RecurrenceUnit | 'specific_days'>('days');
  const [selectedShortcutId, setSelectedShortcutId] = useState<string>('custom');
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');

  const toDateTimeLocal = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const getValidBoardId = (bId?: string) => {
    if (!bId || bId === 'master') {
      return allBoards[0]?.id || 'board-work';
    }
    return bId;
  };

  useEffect(() => {
    if (task) {
      setBoardId(getValidBoardId(task.boardId || currentBoardId));
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setType(task.type);
      setStartDate(toDateTimeLocal(new Date(task.startDate)));
      setEndDate(toDateTimeLocal(new Date(task.endDate)));
      setSelectedTags(task.tags || []);
      setRecurrenceEnabled(task.recurrence?.enabled || false);
      setRecurrenceInterval(task.recurrence?.interval || 15);
      const existingUnit = task.recurrence?.unit || 'days';
      const hasWeekDays = Boolean(task.recurrence?.weekDays && task.recurrence.weekDays.length > 0);
      setRecurrenceUnit(existingUnit);
      setRecurrenceWeekDays(task.recurrence?.weekDays || []);
      setRecurrenceUnitMode(hasWeekDays ? 'specific_days' : existingUnit);
      setSelectedShortcutId('custom');
      setRecurrenceEndCondition(
        task.recurrence?.endCondition || (task.recurrence?.repeatCount ? 'count' : 'until_date')
      );
      if (task.recurrence?.repeatUntilDate) {
        setRecurrenceUntilDate(toDateTimeLocal(new Date(task.recurrence.repeatUntilDate)));
      } else {
        const inThreeMonths = new Date(new Date(task.startDate).getTime() + 90 * 24 * 60 * 60 * 1000);
        setRecurrenceUntilDate(toDateTimeLocal(inThreeMonths));
      }
      setRecurrenceCount(task.recurrence?.repeatCount || 6);
      setGenerateInstances(task.recurrence?.generateInstances !== false);
      setSeriesEditScope(task.recurrenceSeriesId ? 'single' : 'series');
      setReminders(task.reminders || []);
      setAttachments(task.attachments || []);
      setComments(task.comments || []);
      const existingSpanDays =
        (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24);
      prevOverTwoDaysRef.current = existingSpanDays > 2;
      setRecurrenceTouchedManually(Boolean(task.recurrence?.enabled));
      setUntilDateTouchedManually(Boolean(task.recurrence?.repeatUntilDate));
    } else {
      const now = new Date();
      const inTwoHours = new Date(now.getTime() + 1000 * 60 * 60 * 2);
      // Strictly associate with initialBoardId or currentBoardId
      const targetBoard = initialBoardId || (currentBoardId === 'master' ? (allBoards[0]?.id || 'board-work') : currentBoardId);
      setBoardId(targetBoard);
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority(allPriorities[1]?.id || 'media');
      setType(allTypes.find(t => t.id === 'tarea' || t.name.toLowerCase() === 'tarea')?.id || 'tarea');
      setStartDate(toDateTimeLocal(now));
      setEndDate(toDateTimeLocal(inTwoHours));
      setEndMode('date');
      setDurationValue(2);
      setDurationUnit('hours');
      setSelectedTags([]);
      setRecurrenceEnabled(false);
      setRecurrenceInterval(1);
      setRecurrenceUnit('days');
      setRecurrenceUnitMode('days');
      setRecurrenceWeekDays([]);
      setSelectedShortcutId('custom');
      setRecurrenceEndCondition('until_date');
      setRecurrenceUntilDate(toDateTimeLocal(inTwoHours));
      setRecurrenceCount(6);
      setGenerateInstances(true);
      setSeriesEditScope('series');
      setReminders([]);
      setAttachments([]);
      setComments([]);
      setAcceptedLocally([]);
      prevOverTwoDaysRef.current = false;
      setRecurrenceTouchedManually(false);
      setUntilDateTouchedManually(false);
    }

    setActiveTab('details');
    setMicroSessionHours(loadSavedMicroHours());
    setQuickExtendCycles(3);
  }, [task, initialStatus, initialBoardId, currentBoardId, isOpen]);

  const spanHours = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 0;
    return (e - s) / (1000 * 60 * 60);
  }, [startDate, endDate]);

  const spanDays = spanHours / 24;
  const isMicrotaskMode = recurrenceEnabled && !task?.recurrenceSeriesId && spanDays > 2;

  // Regla automática: si la planificación supera los 2 días (> 48h), deja de ser tarea continua
  // y activa automáticamente la periodicidad con microtareas de dedicación efectiva.
  useEffect(() => {
    if (!isOpen || task?.recurrenceSeriesId) return;
    const isOverTwoDays = spanDays > 2;
    const wasOverTwoDays = prevOverTwoDaysRef.current;

    if (isOverTwoDays && !wasOverTwoDays && !recurrenceTouchedManually) {
      setRecurrenceEnabled(true);
      setRecurrenceInterval(1);
      setRecurrenceUnit('days');
      setRecurrenceUnitMode('days');
      setRecurrenceWeekDays([]);
      setSelectedShortcutId('custom');
      setRecurrenceEndCondition('until_date');
      if (endDate) setRecurrenceUntilDate(endDate);
      setGenerateInstances(true);
      setUntilDateTouchedManually(false);
    } else if (!isOverTwoDays && wasOverTwoDays && !recurrenceTouchedManually) {
      setRecurrenceEnabled(false);
    } else if (
      isOverTwoDays &&
      recurrenceEnabled &&
      recurrenceEndCondition === 'until_date' &&
      !untilDateTouchedManually &&
      endDate
    ) {
      setRecurrenceUntilDate(endDate);
    }

    prevOverTwoDaysRef.current = isOverTwoDays;
  }, [
    isOpen,
    task?.recurrenceSeriesId,
    spanDays,
    endDate,
    recurrenceEnabled,
    recurrenceEndCondition,
    recurrenceTouchedManually,
    untilDateTouchedManually,
  ]);

  const previewTime = calculateTimeLevel(
    startDate || new Date().toISOString(),
    endDate || new Date(Date.now() + 3600000).toISOString(),
    Date.now(),
    status === 'done'
  );

  const combinedAccepted = useMemo(() => {
    return [...acceptedCollisions, ...acceptedLocally];
  }, [acceptedCollisions, acceptedLocally]);

  const collisionEndDate = useMemo(() => {
    if (!isMicrotaskMode || !startDate || !endDate) return endDate;
    const sMs = new Date(startDate).getTime();
    const eMs = new Date(endDate).getTime();
    if (isNaN(sMs) || isNaN(eMs)) return endDate;
    const sessionMs = Math.max(30 * 60 * 1000, microSessionHours * 60 * 60 * 1000);
    return toDateTimeLocal(new Date(Math.min(eMs, sMs + sessionMs)));
  }, [isMicrotaskMode, startDate, endDate, microSessionHours]);

  const collisionCheck = useMemo(() => {
    if (!allTasks || allTasks.length === 0 || !startDate || !collisionEndDate) {
      return { collides: false, collidingTasks: [] };
    }
    return checkTaskCollisionWithExisting(
      task?.id,
      type,
      startDate,
      collisionEndDate,
      allTasks,
      allBoards,
      combinedAccepted
    );
  }, [task?.id, type, startDate, collisionEndDate, allTasks, allBoards, combinedAccepted]);

  const previewOccurrences = useMemo(() => {
    if (!recurrenceEnabled || !startDate || !endDate) return [];
    try {
      const sMs = new Date(startDate).getTime();
      const eMs = new Date(endDate).getTime();
      if (isNaN(sMs) || isNaN(eMs) || eMs <= sMs) return [];

      const sessionMs = Math.max(30 * 60 * 1000, microSessionHours * 60 * 60 * 1000);
      const occEndIso = isMicrotaskMode
        ? new Date(Math.min(eMs, sMs + sessionMs)).toISOString()
        : new Date(eMs).toISOString();

      const untilIso = recurrenceEndCondition === 'until_date' && recurrenceUntilDate
        ? new Date(recurrenceUntilDate).toISOString()
        : isMicrotaskMode && recurrenceEndCondition === 'until_date'
        ? new Date(eMs).toISOString()
        : undefined;

      return calculateAllOccurrences(
        new Date(sMs).toISOString(),
        occEndIso,
        {
          enabled: true,
          interval: Math.max(1, recurrenceInterval),
          unit: recurrenceUnit,
          weekDays: recurrenceWeekDays.length > 0 ? recurrenceWeekDays : undefined,
          endCondition: recurrenceEndCondition,
          repeatUntilDate: untilIso,
          repeatCount: recurrenceEndCondition === 'count' ? Math.max(1, recurrenceCount) : undefined,
        },
        90
      );
    } catch {
      return [];
    }
  }, [
    recurrenceEnabled,
    startDate,
    endDate,
    isMicrotaskMode,
    microSessionHours,
    recurrenceInterval,
    recurrenceUnit,
    recurrenceWeekDays,
    recurrenceEndCondition,
    recurrenceUntilDate,
    recurrenceCount,
  ]);

  const selectedBoardObj = allBoards.find((b) => b.id === boardId) || allBoards[0];
  const selectedPriorityObj = allPriorities.find((p) => p.id === priority) || allPriorities[0];
  const selectedTypeObj = allTypes.find((t) => t.id === type) || allTypes[0];

  if (!isOpen) return null;

  const toggleLocalAccept = (pairKey: string) => {
    setAcceptedLocally((prev) =>
      prev.includes(pairKey) ? prev.filter((k) => k !== pairKey) : [...prev, pairKey]
    );
    if (onAcceptCollision) {
      onAcceptCollision(pairKey);
    }
  };

  const handleAvoidCollision = (collidingEndIso: string) => {
    const endMs = new Date(collidingEndIso).getTime();
    const curStartMs = new Date(startDate).getTime();
    const curEndMs = new Date(endDate).getTime();
    const durationMs = Math.max(1000 * 60 * 30, curEndMs - curStartMs);

    const newStart = new Date(endMs + 1000 * 60 * 15); // +15 min buffer
    const newEnd = new Date(newStart.getTime() + durationMs);

    setStartDate(toDateTimeLocal(newStart));
    setEndDate(toDateTimeLocal(newEnd));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalEndMs = new Date(endDate).getTime();
    const startMs = new Date(startDate).getTime();

    // Si la fecha fin queda antes o igual a la fecha de inicio, desplazar automáticamente 12 horas después
    if (!isNaN(startMs) && (isNaN(finalEndMs) || finalEndMs <= startMs)) {
      finalEndMs = startMs + 12 * 60 * 60 * 1000;
    }

    const sessionDurationMs = Math.max(30 * 60 * 1000, microSessionHours * 60 * 60 * 1000);
    const effectiveEndMs =
      isMicrotaskMode && finalEndMs > startMs
        ? Math.min(finalEndMs, startMs + sessionDurationMs)
        : finalEndMs;

    const isSingleCycleEdit = Boolean(task?.recurrenceSeriesId && seriesEditScope === 'single');
    const effectiveRecurrence = isSingleCycleEdit
      ? task?.recurrence
      : recurrenceEnabled
      ? {
          enabled: true,
          interval: Math.max(1, recurrenceInterval),
          unit: recurrenceUnit,
          weekDays: recurrenceWeekDays.length > 0 ? recurrenceWeekDays : undefined,
          endCondition: recurrenceEndCondition,
          repeatUntilDate:
            recurrenceEndCondition === 'until_date'
              ? recurrenceUntilDate
                ? new Date(recurrenceUntilDate).toISOString()
                : new Date(finalEndMs).toISOString()
              : undefined,
          repeatCount: recurrenceEndCondition === 'count' ? Math.max(1, recurrenceCount) : undefined,
          generateInstances,
        }
      : undefined;

    const updatedTask: TaskItem = {
      id: task ? task.id : `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boardId,
      title: title.trim(),
      description: description.trim(),
      status,
      waitingSince: task?.waitingSince ?? null,
      waitingDays: task?.waitingDays,
      frictionPoints: task?.frictionPoints || 0,
      priority,
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(effectiveEndMs).toISOString(),
      completedAt: status === 'done' ? task?.completedAt || new Date().toISOString() : null,
      tags: selectedTags,
      recurrence: effectiveRecurrence,
      recurrenceSeriesId: task?.recurrenceSeriesId,
      recurrenceIndex: task?.recurrenceIndex,
      recurrenceTotal: task?.recurrenceTotal,
      reminders,
      attachments,
      comments,
      createdAt: task ? task.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTask, { editScope: isMicrotaskMode ? 'series' : seriesEditScope });

    if (onAcceptCollision && acceptedLocally.length > 0) {
      acceptedLocally.forEach((key) => {
        const actualKey = key.startsWith('new___')
          ? [updatedTask.id, key.replace('new___', '')].sort().join('___')
          : key;
        onAcceptCollision(actualKey);
      });
    }

    onClose();
  };

  const handleDeleteTask = () => {
    if (!task) return;
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar tarea?',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${task.title}"?`,
      isDestructive: true,
      action: () => {
        onDelete(task.id);
        onClose();
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: (uploadEvent.target?.result as string) || '',
          uploadedAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: TaskComment = {
      id: `comm-${Date.now()}-${Math.random()}`,
      authorName: currentUser?.displayName || 'Tú',
      authorEmail: currentUser?.email || 'yo@chronotask.app',
      authorAvatar: currentUser?.photoURL,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    setComments((prev) => [...prev, newComment]);
    setNewCommentText('');
  };

  const handleToggleReaction = (commentId: string, emoji: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const currentReactions = { ...(c.reactions || {}) };
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...c, reactions: currentReactions };
      })
    );
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    onAddTag(newTagName.trim(), newTagColor);
    setSelectedTags((prev) => [...prev, newTagName.trim()]);
    setNewTagName('');
    setIsAddingTag(false);
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const renderRecurrenceAndRemindersSection = () => (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Repeat className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900">Periodicidad de la Tarea</h4>
                {spanDays > 2 && !task?.recurrenceSeriesId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Auto &gt; 2 días · Microtareas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isMicrotaskMode
                  ? `Ventana de ${Math.round(spanDays * 10) / 10} días dividida en sesiones de ${microSessionHours}h de dedicación efectiva.`
                  : 'Ajuste en horas, días, semanas, meses o años. Al completarla avanza de ciclo.'}
              </p>
            </div>
          </div>
          {!(task?.recurrenceSeriesId && seriesEditScope === 'single') && (
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={recurrenceEnabled}
                onChange={(e) => {
                  setRecurrenceEnabled(e.target.checked);
                  setRecurrenceTouchedManually(true);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          )}
        </div>

        {task?.recurrenceSeriesId && seriesEditScope === 'single' ? (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-blue-950">
                <p className="font-bold">
                  Modo ciclo individual ({task.recurrenceIndex || 1}/{task.recurrenceTotal || '?'})
                </p>
                <p className="text-[11px] text-blue-800/90 mt-0.5">
                  Cambiar su fecha, hora o duración solo modificará este ciclo, sin afectar a los demás.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeriesEditScope('series')}
                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0"
              >
                Editar regla de toda la serie
              </button>
            </div>

            {(() => {
              const futurePending = getFuturePendingSeriesTasks(allTasks, task);
              const totalCycles = task.recurrenceTotal || previewOccurrences.length || 1;
              if (!onExtendSeries && !(onStopSeriesAfter && futurePending.length > 0)) return null;
              return (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  {onExtendSeries && (
                    <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-lg border border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <PlusCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>¿Aún no termina? Agregar ciclos al final:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={quickExtendCycles}
                          onChange={(e) => setQuickExtendCycles(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-14 px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-center text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onExtendSeries(task, Math.max(1, quickExtendCycles));
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          + Extender ({totalCycles} → {totalCycles + Math.max(1, quickExtendCycles)})
                        </button>
                      </div>
                    </div>
                  )}

                  {onStopSeriesAfter && futurePending.length > 0 && (
                    <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-lg border border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                        <StopCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>¿Ya se resolvió? Quedan {futurePending.length} ciclos futuros.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onStopSeriesAfter(task);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Detener seguimiento aquí
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : recurrenceEnabled && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
            {/* Horas de dedicación efectiva por microtarea cuando supera 2 días */}
            {isMicrotaskMode && (
              <div className="col-span-2 p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-indigo-950">
                      Dedicación efectiva por microtarea
                    </div>
                    <p className="text-[11px] text-indigo-800/80">
                      Horas reales que dedicarás en cada sesión programada
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {[1, 2, 3, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        setMicroSessionHours(hrs);
                        saveMicroHours(hrs);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                        microSessionHours === hrs
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/70'
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0.5}
                      max={12}
                      step={0.5}
                      value={microSessionHours}
                      onChange={(e) => {
                        const val = Math.max(0.5, Math.min(12, parseFloat(e.target.value) || 1));
                        setMicroSessionHours(val);
                        saveMicroHours(val);
                      }}
                      className="w-14 px-2 py-1 text-xs font-bold bg-white border border-indigo-300 rounded-lg text-center text-slate-900"
                    />
                    <span className="text-[11px] font-bold text-indigo-900">h</span>
                  </div>
                </div>
              </div>
            )}

            {/* Atajos primero; solo si es Personalizado mostrar Repetir cada y Unidad */}
            <div className="col-span-2 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atajos:
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecurrenceShortcutPickerOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 cursor-pointer hover:bg-indigo-50/70 hover:border-indigo-300 font-semibold transition-colors"
                >
                  <span className="truncate">
                    {{
                      custom: 'Personalizado',
                      daily: 'Diario (cada 1 día)',
                      workdays_3: 'Cada 3 días hábiles',
                      mon_wed_fri: 'Lun, Mié y Vie (Días específicos)',
                      tue_thu_fri: 'Mar, Jue y Vie (Días específicos)',
                      mondays: 'Cada Lunes (Días específicos)',
                      weekly: 'Semanal (cada 1 semana)',
                      every_15d: 'Cada 15 días',
                      biweekly: 'Quincenal (cada 2 semanas)',
                      monthly: 'Mensual (cada 1 mes)',
                      yearly: 'Anual (cada 1 año)',
                    }[selectedShortcutId] || 'Personalizado'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
              </div>

              {selectedShortcutId === 'custom' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    {recurrenceUnitMode !== 'specific_days' && (
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Repetir cada:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                        />
                      </div>
                    )}

                    <div className={recurrenceUnitMode === 'specific_days' ? 'sm:col-span-12' : 'sm:col-span-8'}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Unidad:
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsRecurrenceUnitPickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 cursor-pointer hover:bg-slate-50 font-medium"
                      >
                        <span className="truncate">
                          {recurrenceUnitMode === 'hours'
                            ? 'Horas'
                            : recurrenceUnitMode === 'days'
                            ? 'Días (Calendario)'
                            : recurrenceUnitMode === 'workdays'
                            ? 'Días Hábiles (Lun-Vie)'
                            : recurrenceUnitMode === 'specific_days'
                            ? 'Días específicos (Lun–Dom)'
                            : recurrenceUnitMode === 'weeks'
                            ? 'Semanas'
                            : recurrenceUnitMode === 'months'
                            ? 'Meses'
                            : 'Años'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* Selector de días a incluir (solo visible cuando Unidad = Días específicos) */}
                  {recurrenceUnitMode === 'specific_days' && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800">
                          Días a incluir en la programación:
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600">
                          {recurrenceWeekDays.length} {recurrenceWeekDays.length === 1 ? 'día' : 'días'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: 1, label: 'Lun' },
                          { id: 2, label: 'Mar' },
                          { id: 3, label: 'Mié' },
                          { id: 4, label: 'Jue' },
                          { id: 5, label: 'Vie' },
                          { id: 6, label: 'Sáb' },
                          { id: 0, label: 'Dom' },
                        ].map((d) => {
                          const isSelected = recurrenceWeekDays.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setRecurrenceWeekDays((prev) => {
                                  if (prev.includes(d.id)) {
                                    return prev.length > 1 ? prev.filter((w) => w !== d.id) : prev;
                                  }
                                  return [...prev, d.id];
                                });
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Límite de la Periodicidad */}
            <div className="col-span-2 pt-2 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Límite de la Periodicidad (¿Hasta cuándo se repite?)
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRecurrenceEndCondition('until_date')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    recurrenceEndCondition === 'until_date'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hasta fecha límite
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceEndCondition('count')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    recurrenceEndCondition === 'count'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por repeticiones
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceEndCondition('never')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                    recurrenceEndCondition === 'never'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sin fin (continuo)
                </button>
              </div>

              {recurrenceEndCondition === 'until_date' && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold mr-0.5">Fijar hasta:</span>
                    {[
                      { label: '+1 Mes', days: 30 },
                      { label: '+3 Meses', days: 90 },
                      { label: '+6 Meses', days: 180 },
                      { label: '+1 Año', days: 365 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          const base = startDate ? new Date(startDate) : new Date();
                          const target = new Date(base.getTime() + btn.days * 24 * 60 * 60 * 1000);
                          setRecurrenceUntilDate(toDateTimeLocal(target));
                          setUntilDateTouchedManually(true);
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-slate-200 cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                    {endDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setRecurrenceUntilDate(endDate);
                          setUntilDateTouchedManually(false);
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-slate-200 cursor-pointer"
                      >
                        Misma fecha fin de tarea
                      </button>
                    )}
                  </div>
                  <CustomDateTimePicker
                    label="Fecha límite hasta donde se crearán tareas"
                    value={recurrenceUntilDate}
                    onChange={(val) => {
                      setRecurrenceUntilDate(val);
                      setUntilDateTouchedManually(true);
                    }}
                    required
                  />
                </div>
              )}

              {recurrenceEndCondition === 'count' && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Número total de tareas a programar:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={recurrenceCount}
                      onChange={(e) => {
                        setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1));
                        setRecurrenceEndCondition('count');
                      }}
                      className="w-24 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                    />
                    <div className="flex flex-wrap items-center gap-1">
                      {[3, 6, 12, 24].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            setRecurrenceCount(cnt);
                            setRecurrenceEndCondition('count');
                          }}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md border cursor-pointer ${
                            recurrenceCount === cnt && recurrenceEndCondition === 'count'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-indigo-50'
                          }`}
                        >
                          {cnt} veces
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {recurrenceEndCondition === 'never' && (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                  <p className="font-semibold">Modo continuo</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Al completar cada ciclo, el sistema abrirá automáticamente el siguiente periodo manteniendo la cadena sin fin.
                  </p>
                </div>
              )}
            </div>

            {/* Generar tareas en el tablero */}
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={generateInstances}
                  onChange={(e) => setGenerateInstances(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Crear todas las tareas programadas hasta la fecha fin</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded">Recomendado</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Crea de inmediato una tarea individual para cada ciclo en el tablero Kanban, Calendario y Gantt para verlas y gestionarlas en el tiempo.
                  </p>
                </div>
              </label>
            </div>

            {/* Vista Previa de la Serie */}
            {previewOccurrences.length > 0 && (
              <div className="col-span-2 p-3 bg-indigo-50/90 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                    {isMicrotaskMode
                      ? `Vista previa: ${previewOccurrences.length} sesiones de ${microSessionHours}h c/u`
                      : `Vista previa: ${previewOccurrences.length} tareas programadas`}
                  </span>
                  {isMicrotaskMode && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                      Total: {Math.round(previewOccurrences.length * microSessionHours * 10) / 10}h efectivas
                    </span>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                  {previewOccurrences.slice(0, 15).map((occ) => {
                    const occStart = new Date(occ.startDate);
                    const occEnd = new Date(occ.endDate);
                    const dateText = occStart.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const startTimeText = `${occStart.getHours().toString().padStart(2, '0')}:${occStart.getMinutes().toString().padStart(2, '0')}`;
                    const endTimeText = `${occEnd.getHours().toString().padStart(2, '0')}:${occEnd.getMinutes().toString().padStart(2, '0')}`;
                    const displayTitle = title.trim() || 'Nueva tarea';
                    return (
                      <div
                        key={occ.index}
                        className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-indigo-100 text-slate-700"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            {occ.index}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {displayTitle} {occ.index}/{previewOccurrences.length}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 shrink-0">
                          {dateText} · {isMicrotaskMode ? `${startTimeText}–${endTimeText}` : startTimeText}
                        </span>
                      </div>
                    );
                  })}
                  {previewOccurrences.length > 15 && (
                    <p className="text-[10px] text-center text-indigo-600 font-bold pt-1">
                      + {previewOccurrences.length - 15} tareas programadas más...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Scope Selector & Quick Series Actions if editing an existing task from a series */}
            {task && (task.recurrenceSeriesId || task.recurrence?.enabled) && (() => {
              const futurePending = task.recurrenceSeriesId
                ? getFuturePendingSeriesTasks(allTasks, task)
                : [];
              const currentCycle = task.recurrenceIndex || 1;
              const totalCycles = task.recurrenceTotal || previewOccurrences.length || 1;

              return (
                <div className="col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-amber-600" />
                    {task.recurrenceSeriesId
                      ? `Esta tarea pertenece a una serie de repeticiones (Ciclo ${currentCycle} de ${totalCycles})`
                      : 'Acciones rápidas de periodicidad'}
                  </p>

                  {task.recurrenceSeriesId && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSeriesEditScope('series')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          seriesEditScope === 'series'
                            ? 'bg-amber-100 border-amber-400 font-bold text-amber-950 shadow-2xs'
                            : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-100/50'
                        }`}
                      >
                        <div>Actualizar toda la serie</div>
                        <div className="text-[10px] opacity-75 font-normal">Aplica periodicidad a toda la cadena</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeriesEditScope('single')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          seriesEditScope === 'single'
                            ? 'bg-amber-100 border-amber-400 font-bold text-amber-950 shadow-2xs'
                            : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-100/50'
                        }`}
                      >
                        <div>Solo esta ocurrencia</div>
                        <div className="text-[10px] opacity-75 font-normal">Modifica solo el ciclo {currentCycle}</div>
                      </button>
                    </div>
                  )}

                  {/* Acciones rápidas: Extender serie o Detener seguimiento */}
                  {(onExtendSeries || (onStopSeriesAfter && futurePending.length > 0)) && (
                    <div className="pt-2 border-t border-amber-200/80 space-y-2">
                      {onExtendSeries && (
                        <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-lg border border-amber-200/80">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                            <PlusCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>¿Aún no termina? Agregar ciclos al final:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={quickExtendCycles}
                              onChange={(e) => setQuickExtendCycles(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-14 px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-center text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onExtendSeries(task, Math.max(1, quickExtendCycles));
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                              + Extender ({totalCycles} → {totalCycles + Math.max(1, quickExtendCycles)})
                            </button>
                          </div>
                        </div>
                      )}

                      {onStopSeriesAfter && futurePending.length > 0 && (
                        <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-lg border border-amber-200/80">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                            <StopCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>¿Ya se resolvió? Quedan {futurePending.length} ciclos futuros.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onStopSeriesAfter(task);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Detener seguimiento aquí
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Reminders */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">Recordatorios Push</h4>
            <p className="text-xs text-slate-500">Avisos automáticos antes de vencer la fecha límite</p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {reminders.map((rem, idx) => (
            <div
              key={rem.id}
              className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
            >
              <span className="font-semibold text-slate-800">
                ⏰ {rem.offsetMinutes >= 60 ? `${rem.offsetMinutes / 60}h antes` : `${rem.offsetMinutes}m antes`}
              </span>
              <button
                type="button"
                onClick={() => setReminders(reminders.filter((_, i) => i !== idx))}
                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsReminderPickerOpen(true)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 font-medium"
            >
              <span>
                {newReminderMinutes >= 60 ? `${newReminderMinutes / 60}h antes` : `${newReminderMinutes}m antes`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                const newRem = {
                  id: `rem-${Date.now()}`,
                  offsetMinutes: newReminderMinutes,
                  label: `${newReminderMinutes}m antes`,
                };
                setReminders([...reminders, newRem]);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              + Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  previewTime.level === 'black'
                    ? 'bg-stone-900'
                    : previewTime.level === 'red'
                    ? 'bg-rose-500'
                    : previewTime.level === 'orange'
                    ? 'bg-amber-500'
                    : previewTime.level === 'yellow'
                    ? 'bg-yellow-400'
                    : previewTime.level === 'blue'
                    ? 'bg-sky-500'
                    : 'bg-emerald-500'
                }`}
              />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-semibold ${previewTime.badgeText}`}>
                    {previewTime.label} ({previewTime.percentElapsed.toFixed(0)}%)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{previewTime.remainingText}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Detalles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Comentarios
              {comments.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                  activeTab === 'comments' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {comments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'attachments'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              Adjuntos
              {attachments.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                  activeTab === 'attachments' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {attachments.length}
                </span>
              )}
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 max-h-[calc(80vh-120px)] overflow-y-auto space-y-4">
            {activeTab === 'details' && (
              <>
                {/* Board Selector with Custom Modal Trigger */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                    Tablero Asignado
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBoardPickerOpen(true)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl focus:bg-white text-slate-900 font-semibold cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-md shrink-0 shadow-2xs"
                        style={{ backgroundColor: selectedBoardObj?.color || '#3b82f6' }}
                      />
                      <span className="truncate">Tablero: {selectedBoardObj?.name || 'General'}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Título de la Tarea *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Entregar proyecto final de arquitectura"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles, criterios de aceptación, links o requerimientos..."
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 resize-none"
                  />
                </div>

                {/* Priority & Type Row with Custom Modals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Prioridad
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPriorityPickerOpen(true)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl focus:bg-white text-slate-900 font-medium cursor-pointer capitalize transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Flag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{selectedPriorityObj?.name || priority}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipo de Tarea
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTypePickerOpen(true)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl focus:bg-white text-slate-900 font-medium cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{selectedTypeObj?.name || type}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Real-time Collision Inspector inside TaskModal */}
                {collisionCheck.collides && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Solapamiento con {collisionCheck.collidingTasks.length} actividades</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          collisionCheck.collidingTasks.forEach((item) => {
                            if (!item.isAccepted) toggleLocalAccept(item.pairKey);
                          });
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shrink-0 shadow-2xs"
                      >
                        Permitir todas
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {collisionCheck.collidingTasks.map((item) => {
                        const sTime = new Date(item.task.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const eTime = new Date(item.task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div
                            key={item.pairKey}
                            className="p-2 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.board?.color || '#3b82f6' }}
                                />
                                <span className="font-bold text-xs text-slate-800 truncate">
                                  {item.task.title}
                                </span>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded shrink-0">
                                {sTime} - {eTime}
                              </span>
                              {item.isAccepted && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] shrink-0">
                                  ✓ Permitida
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              {!item.isAccepted ? (
                                <button
                                  type="button"
                                  onClick={() => toggleLocalAccept(item.pairKey)}
                                  className="flex-1 py-0.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-[10px] text-center cursor-pointer transition-colors"
                                >
                                  Permitir Solapamiento
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleLocalAccept(item.pairKey)}
                                  className="py-0.5 px-2 text-slate-500 hover:text-slate-800 text-[10px] font-semibold cursor-pointer"
                                >
                                  Revocar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAvoidCollision(item.task.endDate)}
                                className="flex-1 py-0.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg font-bold text-[10px] text-center cursor-pointer transition-colors"
                              >
                                Mover después
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dates & Duration: Start & End */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Planificación de Tiempo
                    </label>

                    {/* Mode Switcher: Fecha vs Duración */}
                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEndMode('date')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          endMode === 'date'
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fecha Exacta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndMode('duration');
                          // Compute duration based on current start and end
                          const s = new Date(startDate).getTime();
                          const e = new Date(endDate).getTime();
                          const diffHours = Math.max(0.5, (e - s) / (1000 * 60 * 60));
                          setDurationValue(Math.round(diffHours * 10) / 10);
                          setDurationUnit('hours');
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          endMode === 'duration'
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Por Duración
                      </button>
                    </div>
                  </div>

                  {/* Selector de alcance visible al editar un ciclo de una serie */}
                  {task?.recurrenceSeriesId && (
                    <div className="p-2.5 bg-white rounded-xl border border-indigo-200/90 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                          Ciclo {task.recurrenceIndex || 1} de {task.recurrenceTotal || '?'} · ¿A qué aplica este cambio?
                        </span>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setSeriesEditScope('single')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              seriesEditScope === 'single'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Solo este ciclo ({task.recurrenceIndex || 1}/{task.recurrenceTotal || '?'})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeriesEditScope('series')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              seriesEditScope === 'series'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Toda la serie
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {seriesEditScope === 'single'
                          ? 'Puedes mover la fecha o extender la duración solo de este ciclo sin alterar los demás.'
                          : 'Se recalcularán la regla de periodicidad y las fechas para toda la serie.'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Start Date */}
                    <div>
                      <CustomDateTimePicker
                        label="Inicio"
                        required
                        value={startDate}
                        onChange={(newVal) => {
                          setStartDate(newVal);
                          if (endMode === 'duration') {
                            const d = new Date(newVal);
                            if (durationUnit === 'minutes') d.setMinutes(d.getMinutes() + durationValue);
                            else if (durationUnit === 'hours') d.setHours(d.getHours() + durationValue);
                            else if (durationUnit === 'days') d.setDate(d.getDate() + durationValue);
                            else if (durationUnit === 'weeks') d.setDate(d.getDate() + durationValue * 7);
                            else if (durationUnit === 'months') d.setMonth(d.getMonth() + durationValue);
                            else if (durationUnit === 'years') d.setFullYear(d.getFullYear() + durationValue);
                            setEndDate(toDateTimeLocal(d));
                          } else {
                            // Regla: si la fecha fin queda antes o igual a la nueva fecha inicio,
                            // correr la fecha fin 12 horas después de la nueva fecha inicio establecida.
                            const newStartMs = new Date(newVal).getTime();
                            const currentEndMs = new Date(endDate).getTime();
                            if (!isNaN(newStartMs) && (isNaN(currentEndMs) || currentEndMs <= newStartMs)) {
                              const pushedEnd = new Date(newStartMs + 12 * 60 * 60 * 1000);
                              setEndDate(toDateTimeLocal(pushedEnd));
                            }
                          }
                        }}
                      />
                    </div>

                    {/* End Date (by Date or by Duration) */}
                    {endMode === 'date' ? (
                      <div>
                        <CustomDateTimePicker
                          label="Fin (Fecha Límite)"
                          required
                          value={endDate}
                          minDate={startDate}
                          onChange={(newVal) => {
                            const chosenEndMs = new Date(newVal).getTime();
                            const currentStartMs = new Date(startDate).getTime();
                            if (!isNaN(chosenEndMs) && !isNaN(currentStartMs) && chosenEndMs <= currentStartMs) {
                              const pushedEnd = new Date(currentStartMs + 12 * 60 * 60 * 1000);
                              setEndDate(toDateTimeLocal(pushedEnd));
                            } else {
                              setEndDate(newVal);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Duración de la Tarea *
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={durationValue}
                            onChange={(e) => {
                              const val = Math.max(1, parseFloat(e.target.value) || 1);
                              setDurationValue(val);
                              const d = new Date(startDate);
                              if (durationUnit === 'minutes') d.setMinutes(d.getMinutes() + val);
                              else if (durationUnit === 'hours') d.setHours(d.getHours() + val);
                              else if (durationUnit === 'days') d.setDate(d.getDate() + val);
                              else if (durationUnit === 'weeks') d.setDate(d.getDate() + val * 7);
                              else if (durationUnit === 'months') d.setMonth(d.getMonth() + val);
                              else if (durationUnit === 'years') d.setFullYear(d.getFullYear() + val);
                              setEndDate(toDateTimeLocal(d));
                            }}
                            className="w-20 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setIsDurationPickerOpen(true)}
                            className="flex-1 flex items-center justify-between px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 cursor-pointer font-medium hover:bg-slate-50"
                          >
                            <span>
                              {durationUnit === 'minutes'
                                ? 'Minutos'
                                : durationUnit === 'hours'
                                ? 'Horas'
                                : durationUnit === 'days'
                                ? 'Días'
                                : durationUnit === 'weeks'
                                ? 'Semanas'
                                : durationUnit === 'months'
                                ? 'Meses'
                                : 'Años'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>

                        {/* Quick Presets for Duration (minutes, hours, days, weeks, months, years) */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <span className="text-[10px] text-slate-500 font-bold mr-0.5">Rápido:</span>
                          {[
                            { label: '30m', val: 30, unit: 'minutes' as const },
                            { label: '2h', val: 2, unit: 'hours' as const },
                            { label: '4h', val: 4, unit: 'hours' as const },
                            { label: '1d', val: 1, unit: 'days' as const },
                            { label: '3d', val: 3, unit: 'days' as const },
                            { label: '1 sem', val: 1, unit: 'weeks' as const },
                            { label: '2 sem', val: 2, unit: 'weeks' as const },
                            { label: '1 mes', val: 1, unit: 'months' as const },
                            { label: '3 meses', val: 3, unit: 'months' as const },
                            { label: '6 meses', val: 6, unit: 'months' as const },
                            { label: '1 año', val: 1, unit: 'years' as const },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setDurationValue(preset.val);
                                setDurationUnit(preset.unit);
                                const d = new Date(startDate);
                                if (preset.unit === 'minutes') d.setMinutes(d.getMinutes() + preset.val);
                                else if (preset.unit === 'hours') d.setHours(d.getHours() + preset.val);
                                else if (preset.unit === 'days') d.setDate(d.getDate() + preset.val);
                                else if (preset.unit === 'weeks') d.setDate(d.getDate() + preset.val * 7);
                                else if (preset.unit === 'months') d.setMonth(d.getMonth() + preset.val);
                                else if (preset.unit === 'years') d.setFullYear(d.getFullYear() + preset.val);
                                setEndDate(toDateTimeLocal(d));
                              }}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                                durationValue === preset.val && durationUnit === preset.unit
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Fin calculado: {new Date(endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                          {new Date(endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Semáforo proyectado:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${previewTime.badgeBg}`}>
                      {previewTime.label}
                    </span>
                  </div>

                </div>

                {/* Periodicidad y Recordatorios integrados en Detalles */}
                {renderRecurrenceAndRemindersSection()}

                {/* Tags Selector & Add Tag */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      Etiquetas
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(!isAddingTag)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Nueva etiqueta
                    </button>
                  </div>

                  {isAddingTag && (
                    <div className="p-2.5 bg-slate-100 rounded-xl mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nombre etiqueta..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 flex-1"
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        Crear
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((t) => {
                      const isSelected = selectedTags.includes(t.name);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTagSelection(t.name)}
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                            isSelected ? 'font-bold ring-2 ring-blue-400' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: isSelected ? `${t.color}25` : '#f8fafc',
                            borderColor: isSelected ? t.color : '#e2e8f0',
                            color: isSelected ? t.color : '#475569',
                          }}
                        >
                          #{t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Sin comentarios aún.
                    </div>
                  ) : (
                    comments.map((comm) => (
                      <div key={comm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{comm.authorName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{comm.content}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {['👍', '❤️', '🚀', '👀'].map((emoji) => {
                            const count = comm.reactions?.[emoji] || 0;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(comm.id, emoji)}
                                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                  count > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'
                                }`}
                              >
                                {emoji} {count > 0 && count}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-slate-900"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50">
                  <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">Subir archivos adjuntos</p>
                  <label className="mt-2 inline-block px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-xs">
                    Examinar...
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate max-w-[80%]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 transition-colors cursor-pointer"
                >
                  {task?.recurrenceSeriesId
                    ? seriesEditScope === 'single'
                      ? `Guardar solo ciclo ${task.recurrenceIndex || 1}/${task.recurrenceTotal || '?'}`
                      : 'Actualizar toda la serie'
                    : isMicrotaskMode && generateInstances && previewOccurrences.length > 1
                    ? `${isEditing ? 'Segmentar en' : 'Crear'} ${previewOccurrences.length} Microtareas`
                    : recurrenceEnabled && generateInstances && !isEditing && previewOccurrences.length > 1
                    ? `Crear ${previewOccurrences.length} Tareas`
                    : isEditing
                    ? 'Guardar Cambios'
                    : 'Crear Tarea'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 1. Custom Board Picker Modal */}
      {isBoardPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Seleccionar Tablero</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBoardPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {allBoards.map((b) => {
                const isSelected = boardId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBoardId(b.id);
                      setIsBoardPickerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
                        style={{ backgroundColor: b.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-900 truncate">{b.name}</p>
                        {b.description && (
                          <p className="text-[10px] text-slate-400 truncate">{b.description}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom Priority Picker Modal */}
      {isPriorityPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-800">Seleccionar Prioridad</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPriorityPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {allPriorities.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPriority(p.id);
                      setIsPriorityPickerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer capitalize ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Flag className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-900">{p.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Type Picker Modal */}
      {isTypePickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tipo de Actividad</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTypePickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {allTypes.map((t) => {
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      setIsTypePickerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900">{t.name}</p>
                      {t.id === 'evento' || t.name.toLowerCase().includes('evento') ? (
                        <span className="inline-block text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded mt-0.5">
                          Evento con horario exclusivo
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] text-slate-500 font-normal mt-0.5">
                          Permite ejecución paralela
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Custom Duration Unit Picker Modal */}
      <OptionPickerModal
        isOpen={isDurationPickerOpen}
        title="Unidad de Duración"
        subtitle="Selecciona la escala de tiempo"
        icon={Clock}
        options={[
          { id: 'minutes', label: 'Minutos' },
          { id: 'hours', label: 'Horas' },
          { id: 'days', label: 'Días' },
          { id: 'weeks', label: 'Semanas' },
          { id: 'months', label: 'Meses' },
          { id: 'years', label: 'Años' },
        ]}
        selectedValue={durationUnit}
        onSelect={(val) => {
          setDurationUnit(val);
          const d = new Date(startDate);
          if (val === 'minutes') d.setMinutes(d.getMinutes() + durationValue);
          else if (val === 'hours') d.setHours(d.getHours() + durationValue);
          else if (val === 'days') d.setDate(d.getDate() + durationValue);
          else if (val === 'weeks') d.setDate(d.getDate() + durationValue * 7);
          else if (val === 'months') d.setMonth(d.getMonth() + durationValue);
          else if (val === 'years') d.setFullYear(d.getFullYear() + durationValue);
          setEndDate(toDateTimeLocal(d));
        }}
        onClose={() => setIsDurationPickerOpen(false)}
      />

      {/* 5. Custom Recurrence Unit Picker Modal */}
      <OptionPickerModal
        isOpen={isRecurrenceUnitPickerOpen}
        title="Unidad de Repetición"
        subtitle="Elige el intervalo o los días específicos"
        icon={Repeat}
        options={[
          { id: 'hours', label: 'Horas' },
          { id: 'days', label: 'Días (Calendario)' },
          { id: 'workdays', label: 'Días Hábiles (Lun a Vie)' },
          { id: 'specific_days', label: 'Días específicos (Lun–Dom)' },
          { id: 'weeks', label: 'Semanas' },
          { id: 'months', label: 'Meses' },
          { id: 'years', label: 'Años' },
        ]}
        selectedValue={recurrenceUnitMode}
        onSelect={(val) => {
          const nextMode = val as RecurrenceUnit | 'specific_days';
          setRecurrenceUnitMode(nextMode);
          setSelectedShortcutId('custom');
          if (nextMode === 'specific_days') {
            setRecurrenceUnit('weeks');
            setRecurrenceInterval(1);
            if (recurrenceWeekDays.length === 0) {
              const baseDay = startDate ? new Date(startDate).getDay() : new Date().getDay();
              setRecurrenceWeekDays([baseDay]);
            }
          } else {
            setRecurrenceUnit(nextMode);
            setRecurrenceWeekDays([]);
          }
        }}
        onClose={() => setIsRecurrenceUnitPickerOpen(false)}
      />

      {/* 5b. Custom Recurrence Shortcut Picker Modal */}
      <OptionPickerModal
        isOpen={isRecurrenceShortcutPickerOpen}
        title="Atajos de Periodicidad"
        subtitle="Elige un atajo o Personalizado para ajustar manualmente"
        icon={Repeat}
        options={[
          { id: 'custom', label: 'Personalizado' },
          { id: 'daily', label: 'Diario (cada 1 día)' },
          { id: 'workdays_3', label: 'Cada 3 días hábiles' },
          { id: 'mon_wed_fri', label: 'Lun, Mié y Vie (Días específicos)' },
          { id: 'tue_thu_fri', label: 'Mar, Jue y Vie (Días específicos)' },
          { id: 'mondays', label: 'Cada Lunes (Días específicos)' },
          { id: 'weekly', label: 'Semanal (cada 1 semana)' },
          { id: 'every_15d', label: 'Cada 15 días' },
          { id: 'biweekly', label: 'Quincenal (cada 2 semanas)' },
          { id: 'monthly', label: 'Mensual (cada 1 mes)' },
          { id: 'yearly', label: 'Anual (cada 1 año)' },
        ]}
        selectedValue={selectedShortcutId}
        onSelect={(val) => {
          const id = String(val);
          if (id === 'custom') {
            setSelectedShortcutId('custom');
            return;
          }
          const presets: Record<
            string,
            { mode: RecurrenceUnit | 'specific_days'; interval: number; unit: RecurrenceUnit; weekDays: number[] }
          > = {
            daily: { mode: 'days', interval: 1, unit: 'days', weekDays: [] },
            workdays_3: { mode: 'workdays', interval: 3, unit: 'workdays', weekDays: [] },
            mon_wed_fri: { mode: 'specific_days', interval: 1, unit: 'weeks', weekDays: [1, 3, 5] },
            tue_thu_fri: { mode: 'specific_days', interval: 1, unit: 'weeks', weekDays: [2, 4, 5] },
            mondays: { mode: 'specific_days', interval: 1, unit: 'weeks', weekDays: [1] },
            weekly: { mode: 'weeks', interval: 1, unit: 'weeks', weekDays: [] },
            every_15d: { mode: 'days', interval: 15, unit: 'days', weekDays: [] },
            biweekly: { mode: 'weeks', interval: 2, unit: 'weeks', weekDays: [] },
            monthly: { mode: 'months', interval: 1, unit: 'months', weekDays: [] },
            yearly: { mode: 'years', interval: 1, unit: 'years', weekDays: [] },
          };
          const chosen = presets[id];
          if (chosen) {
            setRecurrenceUnitMode(chosen.mode);
            setRecurrenceInterval(chosen.interval);
            setRecurrenceUnit(chosen.unit);
            setRecurrenceWeekDays(chosen.weekDays);
            setSelectedShortcutId(id);
          }
        }}
        onClose={() => setIsRecurrenceShortcutPickerOpen(false)}
      />

      {/* 6. Custom Push Reminder Offset Picker Modal */}
      <OptionPickerModal
        isOpen={isReminderPickerOpen}
        title="Anticipación del Recordatorio"
        subtitle="Momento de envío de la notificación"
        icon={Clock}
        options={[
          { id: 10, label: '10 minutos antes' },
          { id: 30, label: '30 minutos antes' },
          { id: 60, label: '1 hora antes' },
          { id: 120, label: '2 horas antes' },
          { id: 1440, label: '1 día antes' },
        ]}
        selectedValue={newReminderMinutes}
        onSelect={(val) => setNewReminderMinutes(Number(val))}
        onClose={() => setIsReminderPickerOpen(false)}
      />
    </>
  );
};
