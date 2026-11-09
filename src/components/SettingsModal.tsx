import React, { useState, useEffect } from 'react';
import {
  Board,
  CustomPriorityDefinition,
  CustomTag,
  CustomTypeDefinition,
  LightThemeConfig,
  BiometricRecord,
  UserProfile,
  TaskItem,
  ImportBoardAction,
  ImportResolutionMode,
  BackgroundTone,
  CloudBackupSnapshot,
  PlanningPeriodConfig,
} from '../types';
import { LIGHT_THEMES } from '../services/storage';
import { TIME_COLOR_LEGEND } from '../utils/timeColor';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import {
  registerBiometricCredential,
  verifyBiometricCredential,
  clearBiometrics,
  setVaultLocked,
  isBiometricsAvailable,
} from '../services/biometrics';
import {
  exportBoardToBase64,
  parseBoardFromBase64,
  BoardExportPackage,
} from '../utils/boardTransfer';
import { OptionPickerModal, PickerOption } from './OptionPickerModal';
import {
  X,
  Settings,
  FolderKanban,
  Tag,
  Flag,
  Layers,
  Palette,
  Plus,
  Trash2,
  Check,
  Fingerprint,
  Clock,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  Download,
  Upload,
  ArrowDownUp,
  FileText,
  ChevronDown,
  Pencil,
  CloudUpload,
  CloudDownload,
  Menu,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  History,
  CalendarRange,
  Calendar,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  onAddBoard: (name: string, description: string, color: string, includeInMaster?: boolean) => void;
  onUpdateBoard?: (boardId: string, name: string, description: string, color: string, includeInMaster?: boolean) => void;
  onDeleteBoard: (boardId: string) => void;
  types: CustomTypeDefinition[];
  onAddType: (name: string, color: string) => void;
  onDeleteType: (typeId: string) => void;
  priorities: CustomPriorityDefinition[];
  onAddPriority: (name: string, color: string) => void;
  onDeletePriority: (priorityId: string) => void;
  tags: CustomTag[];
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  currentTheme: LightThemeConfig;
  onThemeChange: (theme: LightThemeConfig) => void;
  currentUser: UserProfile | null;
  biometricRecord: BiometricRecord;
  onBiometricStatusChange: () => void;
  allTasks: TaskItem[];
  onImportBoard: (action: ImportBoardAction) => void;
  onUploadCloudBackup?: () => Promise<boolean>;
  onRestoreCloudBackup?: (snapshot?: CloudBackupSnapshot) => Promise<boolean>;
  cloudBackups?: CloudBackupSnapshot[];
  isLoadingBackups?: boolean;
  onRefreshCloudBackups?: () => Promise<void>;
  onDeleteCloudBackup?: (backupId: string) => Promise<boolean>;
  cloudSyncStatus?: { loading: boolean; lastSyncTime: string | null; msg: string | null; isError?: boolean };
  bgTone?: BackgroundTone;
  onBgToneChange?: (tone: BackgroundTone) => void;
  planningPeriod?: PlanningPeriodConfig;
  onPlanningPeriodChange?: (config: PlanningPeriodConfig) => void;
  initialTab?: 'boards' | 'transfer' | 'planning' | 'types' | 'priorities' | 'tags' | 'theme';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  boards,
  onAddBoard,
  onUpdateBoard,
  onDeleteBoard,
  types,
  onAddType,
  onDeleteType,
  priorities,
  onAddPriority,
  onDeletePriority,
  tags,
  onAddTag,
  onDeleteTag,
  currentTheme,
  onThemeChange,
  currentUser,
  biometricRecord,
  onBiometricStatusChange,
  allTasks,
  onImportBoard,
  onUploadCloudBackup,
  onRestoreCloudBackup,
  cloudBackups = [],
  isLoadingBackups = false,
  onRefreshCloudBackups,
  onDeleteCloudBackup,
  cloudSyncStatus,
  bgTone = 'cream',
  onBgToneChange,
  planningPeriod = { enabled: false, startDate: '', endDate: '', name: 'Plan Actual' },
  onPlanningPeriodChange,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    'boards' | 'transfer' | 'planning' | 'types' | 'priorities' | 'tags' | 'theme'
  >(initialTab || 'boards');
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Cloud Backups Confirmation States
  const [backupToRestoreConfirm, setBackupToRestoreConfirm] = useState<CloudBackupSnapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToDeleteConfirm, setBackupToDeleteConfirm] = useState<CloudBackupSnapshot | null>(null);
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);

  const formatBackupDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `hace ${days}d`;
      if (hours > 0) return `hace ${hours}h`;
      if (mins > 0) return `hace ${mins}m`;
      return 'hace instantes';
    } catch {
      return '';
    }
  };

  // Form states
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#2563eb');
  const [newBoardIncludeInMaster, setNewBoardIncludeInMaster] = useState(true);

  // Board Edit State
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardDesc, setEditBoardDesc] = useState('');
  const [editBoardColor, setEditBoardColor] = useState('#2563eb');
  const [editBoardIncludeInMaster, setEditBoardIncludeInMaster] = useState(true);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#64748b');

  const [newPriorityName, setNewPriorityName] = useState('');
  const [newPriorityColor, setNewPriorityColor] = useState('#ea580c');

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  // Biometrics states inside settings
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMsg, setBioMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Transfer (Export / Import) states
  const [transferMode, setTransferMode] = useState<'export' | 'import'>('export');
  const [selectedExportBoardId, setSelectedExportBoardId] = useState<string>(boards[0]?.id || '');
  const [isExportBoardPickerOpen, setIsExportBoardPickerOpen] = useState(false);
  const [generatedBase64, setGeneratedBase64] = useState<string>('');
  const [copiedBase64, setCopiedBase64] = useState(false);

  // Import states
  const [importBase64Input, setImportBase64Input] = useState('');
  const [parsedPackage, setParsedPackage] = useState<BoardExportPackage | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResolution, setImportResolution] = useState<ImportResolutionMode>('new_board');
  const [importSuffix, setImportSuffix] = useState(' (Importado)');
  const [importNewBoardName, setImportNewBoardName] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    onAddBoard(newBoardName.trim(), newBoardDesc.trim(), newBoardColor, newBoardIncludeInMaster);
    setNewBoardName('');
    setNewBoardDesc('');
    setNewBoardIncludeInMaster(true);
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    onAddType(newTypeName.trim(), newTypeColor);
    setNewTypeName('');
  };

  const handleCreatePriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityName.trim()) return;
    onAddPriority(newPriorityName.trim(), newPriorityColor);
    setNewPriorityName('');
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTag(newTagName.trim(), newTagColor);
    setNewTagName('');
  };

  const handleEnrollBio = async () => {
    setBioLoading(true);
    setBioMsg(null);
    try {
      await registerBiometricCredential(currentUser?.displayName || 'Usuario KronoTask');
      setBioMsg({ text: '✓ ¡Huella / FaceID registrada exitosamente!', isError: false });
      onBiometricStatusChange();
    } catch (err: any) {
      setBioMsg({ text: err.message || 'Error al enrolar biometría', isError: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleTestBio = async () => {
    setBioLoading(true);
    setBioMsg(null);
    try {
      await verifyBiometricCredential();
      setBioMsg({ text: '✓ ¡Identidad biométrica validada! Acceso correcto.', isError: false });
    } catch (err: any) {
      setBioMsg({ text: err.message || 'Error en la verificación', isError: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleLockNow = () => {
    setVaultLocked(true);
    onBiometricStatusChange();
    onClose();
  };

  const handleRemoveBio = () => {
    clearBiometrics();
    setBioMsg({ text: 'Biometría eliminada de este equipo.', isError: false });
    onBiometricStatusChange();
  };

  // Export handlers
  const handleGenerateExport = () => {
    let base64 = '';
    if (selectedExportBoardId === 'all') {
      base64 = exportBoardToBase64('all', boards, allTasks, tags, types, priorities);
    } else {
      const boardToExport = boards.find((b) => b.id === selectedExportBoardId) || boards[0];
      if (!boardToExport) return;
      base64 = exportBoardToBase64(boardToExport, boards, allTasks, tags, types, priorities);
    }
    setGeneratedBase64(base64);
    setCopiedBase64(false);
  };

  const handleCopyBase64 = async () => {
    if (!generatedBase64) return;
    await navigator.clipboard.writeText(generatedBase64);
    setCopiedBase64(true);
    setTimeout(() => setCopiedBase64(false), 2500);
  };

  const handleDownloadExportFile = () => {
    if (!generatedBase64) return;
    const isAll = selectedExportBoardId === 'all';
    const boardToExport = boards.find((b) => b.id === selectedExportBoardId);
    const filename = isAll
      ? 'kronotask-respaldo-completo-todos-los-tableros.kronotask'
      : `kronotask-${(boardToExport?.name || 'tablero').toLowerCase().replace(/\s+/g, '-')}.kronotask`;

    const blob = new Blob([generatedBase64], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import handlers
  const handleParseImport = () => {
    setImportError(null);
    setImportSuccessMsg(null);
    try {
      const parsed = parseBoardFromBase64(importBase64Input);
      if (!parsed.board && parsed.boards && parsed.boards.length > 0) {
        parsed.board = parsed.boards[0];
      }
      setParsedPackage(parsed);

      const targetName = parsed.board?.name || 'Tablero';
      const match = boards.find(
        (b) => b.name.trim().toLowerCase() === targetName.trim().toLowerCase()
      );
      if (match) {
        setImportResolution('merge');
      } else {
        setImportResolution('new_board');
      }
      setImportNewBoardName(`${targetName} (Importado)`);
    } catch (e: any) {
      setImportError(e.message || 'Código Base64 no válido.');
      setParsedPackage(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportBase64Input(content.trim());
        setImportError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!parsedPackage) return;

    if (parsedPackage.format === 'kronotask-multi-v1' && parsedPackage.boards && parsedPackage.boards.length > 0) {
      parsedPackage.boards.forEach((b) => {
        const bTasks = parsedPackage.tasks.filter((t) => t.boardId === b.id);
        onImportBoard({
          mode: 'new_board',
          targetBoardId: b.id,
          newBoardName: b.name,
          board: b,
          tasks: bTasks.length > 0 ? bTasks : parsedPackage.tasks,
          suffix: '',
        });
      });
      setImportSuccessMsg(
        `✓ Se importaron exitosamente ${parsedPackage.boards.length} tableros y ${parsedPackage.tasks.length} tareas.`
      );
    } else {
      const targetBoard = parsedPackage.board || (parsedPackage.boards && parsedPackage.boards[0]);
      if (!targetBoard) return;
      const matchingBoard = boards.find(
        (b) => b.name.trim().toLowerCase() === targetBoard.name.trim().toLowerCase()
      );

      onImportBoard({
        mode: importResolution,
        targetBoardId: matchingBoard?.id || boards[0]?.id,
        newBoardName: importNewBoardName.trim() || `${targetBoard.name} (Importado)`,
        board: targetBoard,
        tasks: parsedPackage.tasks,
        suffix: importSuffix,
      });

      setImportSuccessMsg(
        `✓ Tablero "${targetBoard.name}" importado con éxito (${parsedPackage.tasks.length} tareas procesadas).`
      );
    }

    setParsedPackage(null);
    setImportBase64Input('');
  };

  const SECTIONS = [
    {
      id: 'boards' as const,
      label: 'Tableros',
      description: 'Crear, renombrar y organizar tableros de trabajo',
      icon: FolderKanban,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      id: 'planning' as const,
      label: 'Planificación Actual',
      description: 'Fechas de inicio y fin del plan activo y arrastre de tareas',
      icon: CalendarRange,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      badge: planningPeriod?.enabled ? 'Activo' : undefined,
    },
    {
      id: 'transfer' as const,
      label: 'Compartir y Respaldo',
      description: 'Exportar e importar Base64 o Sincronizar en la nube',
      icon: Share2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      id: 'theme' as const,
      label: 'Tono de Fondo y Tema',
      description: 'Fondo Cremita, Gris o Blanco y densidad visual',
      icon: Palette,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      id: 'types' as const,
      label: 'Tipos de Tarea',
      description: 'Categorías y estilos visuales',
      icon: Layers,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      id: 'priorities' as const,
      label: 'Prioridades / Criticidad',
      description: 'Niveles de criticidad y colores',
      icon: Flag,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      id: 'tags' as const,
      label: 'Etiquetas',
      description: 'Etiquetas personalizadas para filtrar',
      icon: Tag,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  const currentSection = SECTIONS.find((s) => s.id === activeTab) || SECTIONS[0];
  const ActiveIcon = currentSection.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ajustes Generales</h2>
              <p className="text-xs text-slate-500">
                Tableros, respaldo Base64, fondo y tema, semáforo y seguridad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Bar: Hamburger Menu Button & Section Selector (Elimina desplazamiento horizontal) */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger Button to Deploy Pre-modal / Menu */}
            <button
              type="button"
              onClick={() => setIsSectionMenuOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Abrir menú de secciones de ajustes"
            >
              <Menu className="w-4 h-4" />
              <span>Menú Secciones</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
            </button>

            {/* Current Active Section Indicator Badge (Also clickable to open premodal) */}
            <button
              type="button"
              onClick={() => setIsSectionMenuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-xs font-bold text-slate-800 cursor-pointer shadow-2xs min-w-0 truncate"
              title="Cambiar sección"
            >
              <ActiveIcon className={`w-3.5 h-3.5 ${currentSection.color} shrink-0`} />
              <span className="truncate">{currentSection.label}</span>
              {currentSection.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSectionMenuOpen(true)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 items-center gap-1 cursor-pointer shrink-0 hidden sm:flex"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Premodal / Menú Desplegable de Secciones */}
        {isSectionMenuOpen && (
          <div className="absolute inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-100">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Menu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Secciones de Ajustes</h3>
                    <p className="text-[11px] text-slate-500">Selecciona la sección que deseas abrir</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSectionMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 flex-1">
                {SECTIONS.map((sec) => {
                  const SecIcon = sec.icon;
                  const isSelected = activeTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(sec.id);
                        setIsSectionMenuOpen(false);
                      }}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-400 shadow-2xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${sec.bg}`}>
                          <SecIcon className={`w-4 h-4 ${sec.color}`} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-blue-900 font-extrabold' : 'text-slate-800'
                              }`}
                            >
                              {sec.label}
                            </span>
                            {sec.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {sec.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[220px] sm:max-w-[280px]">
                            {sec.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSectionMenuOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB: EXPORT / IMPORT BASE64 AND CLOUD SYNC */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              {/* Google Cloud Full Backup & Snapshot Rotation Section */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/90 p-4 rounded-3xl border border-indigo-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                      <CloudUpload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">Respaldos en la Nube (Google Cloud)</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Máx 4 copias
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Cada respaldo es una copia 100% completa. Al restaurar, se sobreescribe el estado local sin fusionar.
                      </p>
                    </div>
                  </div>
                  {onRefreshCloudBackups && (
                    <button
                      type="button"
                      disabled={isLoadingBackups}
                      onClick={onRefreshCloudBackups}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                      title="Refrescar lista de respaldos"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-3">
                    {/* Status Alert Banner */}
                    {cloudSyncStatus?.msg && (
                      <div
                        className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs ${
                          cloudSyncStatus.isError
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {cloudSyncStatus.isError ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate">{cloudSyncStatus.msg}</span>
                        </div>
                        {cloudSyncStatus.lastSyncTime && (
                          <span className="text-[10px] opacity-80 shrink-0 font-medium">
                            {cloudSyncStatus.lastSyncTime}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action: Create New Full Backup */}
                    <button
                      type="button"
                      disabled={cloudSyncStatus?.loading}
                      onClick={onUploadCloudBackup}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>Subir Nueva Copia Completa (Respaldar {allTasks.length} Tareas)</span>
                    </button>

                    <p className="text-[10px] text-slate-500 font-medium text-center">
                      ℹ️ El respaldo más nuevo se guardará al principio. Si ya tienes 4 respaldos, el más antiguo se rotará y eliminará automáticamente.
                    </p>

                    {/* Backups History List */}
                    <div className="pt-2 border-t border-indigo-100/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          Historial de Respaldos ({cloudBackups.length} de 4 disponibles)
                        </span>
                      </div>

                      {isLoadingBackups ? (
                        <div className="p-4 bg-white/70 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Cargando respaldos disponibles en la nube...</span>
                        </div>
                      ) : cloudBackups.length === 0 ? (
                        <div className="p-4 bg-white/70 rounded-2xl border border-dashed border-slate-300 text-center space-y-1">
                          <p className="text-xs font-bold text-slate-700">Aún no hay respaldos en la nube</p>
                          <p className="text-[11px] text-slate-500">
                            Presiona "Subir Nueva Copia Completa" para crear tu primer respaldo.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cloudBackups.map((backup, idx) => {
                            const isNewest = idx === 0;
                            const isOldest = idx === cloudBackups.length - 1 && cloudBackups.length >= 4;
                            return (
                              <div
                                key={backup.id}
                                className={`p-3 bg-white rounded-2xl border transition-all shadow-2xs space-y-2 ${
                                  isNewest ? 'border-emerald-300 ring-1 ring-emerald-200/60' : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                      isNewest
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : isOldest
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {isNewest ? '⭐ Copia #1 (Más Reciente)' : isOldest ? `Copia #${idx + 1} (Próx. a rotar)` : `Copia #${idx + 1}`}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                      {formatBackupDate(backup.createdAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                      {backup.deviceInfo || 'Nube'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formatRelativeTime(backup.createdAt)}
                                    </span>
                                  </div>
                                </div>

                                {/* Counts chips */}
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-100">
                                    📋 {backup.taskCount} tareas
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                                    ✅ {backup.completedTaskCount} completadas
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                    📁 {backup.boardCount} tableros
                                  </span>
                                </div>

                                {/* Actions row */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setBackupToRestoreConfirm(backup)}
                                    className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restaurar y Sobreescribir Local</span>
                                  </button>

                                  {onDeleteCloudBackup && (
                                    <button
                                      type="button"
                                      onClick={() => setBackupToDeleteConfirm(backup)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                      title="Eliminar este respaldo de la nube"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/90 rounded-2xl border border-indigo-100 text-xs text-slate-600 flex items-center justify-between">
                    <span>Inicia sesión con Google para acceder al historial de respaldos en la nube.</span>
                  </div>
                )}
              </div>

              {/* Segmented control: Exportar vs Importar */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTransferMode('export')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    transferMode === 'export'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Exportar Tablero</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferMode('import')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    transferMode === 'import'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  <span>Importar Tablero</span>
                </button>
              </div>

              {/* Success Notification */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{importSuccessMsg}</span>
                </div>
              )}

              {/* Subview: EXPORT */}
              {transferMode === 'export' && (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      Selecciona el tablero que deseas compartir o respaldar:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsExportBoardPickerOpen(true)}
                      className="w-full text-xs font-bold p-3 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between cursor-pointer shadow-2xs text-slate-800"
                    >
                      <span className="truncate">
                        {selectedExportBoardId === 'all'
                          ? `⭐ TODOS los Tableros (${boards.length} tableros)`
                          : `Tablero: ${boards.find((b) => b.id === selectedExportBoardId)?.name || 'Seleccionado'}`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateExport}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Generar Código Base64</span>
                    </button>
                  </div>

                  {generatedBase64 && (
                    <div className="space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Código Base64 del Tablero:
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {generatedBase64.length} caracteres
                        </span>
                      </div>

                      <textarea
                        readOnly
                        rows={4}
                        value={generatedBase64}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        className="w-full p-2.5 bg-slate-900 text-amber-200 font-mono text-[11px] rounded-xl border border-slate-800 outline-none resize-none select-all"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyBase64}
                          className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          {copiedBase64 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBase64 ? '¡Copiado al portapapeles!' : 'Copiar código Base64'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadExportFile}
                          className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Descargar archivo .kronotask"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Descargar Archivo</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Copia este código y envíaselo a otra persona para que lo importe en KronoTask con todas sus tareas, etiquetas y configuración intacta.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Subview: IMPORT */}
              {transferMode === 'import' && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Pega el código Base64 o carga un archivo exportado:
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Pega aquí el texto Base64 copiado..."
                      value={importBase64Input}
                      onChange={(e) => {
                        setImportBase64Input(e.target.value);
                        setParsedPackage(null);
                        setImportError(null);
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cargar archivo .kronotask</span>
                        <input
                          type="file"
                          accept=".kronotask,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleParseImport}
                        disabled={!importBase64Input.trim()}
                        className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Analizar Contenido
                      </button>
                    </div>
                  </div>

                  {importError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="font-semibold">{importError}</p>
                    </div>
                  )}

                  {/* Preview and Resolution Options */}
                  {parsedPackage && (
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                            Tablero detectado
                          </span>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: (parsedPackage.board || parsedPackage.boards?.[0])?.color || '#3b82f6' }}
                            />
                            {(parsedPackage.board || parsedPackage.boards?.[0])?.name || 'Tablero'}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-black shadow-2xs">
                          {parsedPackage.tasks.length} tareas
                        </span>
                      </div>

                      {/* Conflict / Resolution Options */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">
                          ¿Cómo deseas importar las tareas?
                        </label>

                        {/* Option 1: Overwrite */}
                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            importResolution === 'overwrite'
                              ? 'bg-white border-rose-500 shadow-xs ring-1 ring-rose-500/20'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="resolution"
                            value="overwrite"
                            checked={importResolution === 'overwrite'}
                            onChange={() => setImportResolution('overwrite')}
                            className="mt-0.5 accent-rose-600"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">
                              1. Sobrescribir tablero existente
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Reemplaza todas las tareas actuales del tablero con el mismo nombre por las importadas.
                            </span>
                          </div>
                        </label>

                        {/* Option 2: Merge */}
                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            importResolution === 'merge'
                              ? 'bg-white border-blue-600 shadow-xs ring-1 ring-blue-600/20'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="resolution"
                            value="merge"
                            checked={importResolution === 'merge'}
                            onChange={() => setImportResolution('merge')}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div className="text-xs flex-1">
                            <span className="font-bold text-slate-900 block">
                              2. Combinar (agregando las tareas con un sufijo)
                            </span>
                            <span className="text-[11px] text-slate-500 block mb-1.5">
                              Conserva tus tareas actuales y añade las importadas añadiendo un sufijo a sus títulos:
                            </span>
                            {importResolution === 'merge' && (
                              <input
                                type="text"
                                value={importSuffix}
                                onChange={(e) => setImportSuffix(e.target.value)}
                                placeholder="Sufijo, ej:  (Importado)"
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </div>
                        </label>

                        {/* Option 3: New Board */}
                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            importResolution === 'new_board'
                              ? 'bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-600/20'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="resolution"
                            value="new_board"
                            checked={importResolution === 'new_board'}
                            onChange={() => setImportResolution('new_board')}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div className="text-xs flex-1">
                            <span className="font-bold text-slate-900 block">
                              3. Agregar en un nuevo tablero
                            </span>
                            <span className="text-[11px] text-slate-500 block mb-1.5">
                              Crea un tablero separado e independiente con este nombre:
                            </span>
                            {importResolution === 'new_board' && (
                              <input
                                type="text"
                                value={importNewBoardName}
                                onChange={(e) => setImportNewBoardName(e.target.value)}
                                placeholder="Nombre del nuevo tablero"
                                className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            )}
                          </div>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar e Importar al Sistema</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: BOARDS */}
          {activeTab === 'boards' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateBoard} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">Crear Nuevo Tablero</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del tablero..."
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    className="p-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none sm:col-span-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBoardColor}
                      onChange={(e) => setNewBoardColor(e.target.value)}
                      className="w-9 h-9 p-1 border border-slate-300 rounded-xl cursor-pointer bg-white"
                      title="Color distintivo"
                    />
                    <button
                      type="submit"
                      disabled={!newBoardName.trim()}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Crear
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBoardIncludeInMaster}
                    onChange={(e) => setNewBoardIncludeInMaster(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <span>⭐ Incluir tareas en Tablero Master</span>
                </label>
              </form>

              <div className="space-y-2">
                {boards.map((b) => {
                  const isEditing = editingBoardId === b.id;

                  if (isEditing) {
                    return (
                      <form
                        key={b.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!editBoardName.trim()) return;
                          onUpdateBoard?.(b.id, editBoardName.trim(), editBoardDesc.trim(), editBoardColor, editBoardIncludeInMaster);
                          setEditingBoardId(null);
                        }}
                        className="p-3 bg-blue-50/60 rounded-2xl border-2 border-blue-400 space-y-2 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            Editar Nombre y Datos del Tablero
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingBoardId(null)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          required
                          value={editBoardName}
                          onChange={(e) => setEditBoardName(e.target.value)}
                          placeholder="Nombre del tablero..."
                          className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />

                        <input
                          type="text"
                          value={editBoardDesc}
                          onChange={(e) => setEditBoardDesc(e.target.value)}
                          placeholder="Descripción opcional..."
                          className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />

                        <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={editBoardIncludeInMaster}
                            onChange={(e) => setEditBoardIncludeInMaster(e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                          />
                          <span>⭐ Incluir en Tablero Master</span>
                        </label>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-600 font-semibold">Color:</span>
                            <input
                              type="color"
                              value={editBoardColor}
                              onChange={(e) => setEditBoardColor(e.target.value)}
                              className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingBoardId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Guardar
                            </button>
                          </div>
                        </div>
                      </form>
                    );
                  }

                  const isIncludedInMaster = b.includeInMaster !== false;

                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-2xs shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        <div className="truncate flex-1">
                          <span className="text-xs font-bold text-slate-900 block truncate">{b.name}</span>
                          {b.description && (
                            <span className="text-[10px] text-slate-400 block truncate">{b.description}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* Checkbox rápido para activar/desactivar inclusión en Master */}
                        <label
                          className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-xl border cursor-pointer transition-colors ${
                            isIncludedInMaster
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Alternar inclusión en Tablero Master"
                        >
                          <input
                            type="checkbox"
                            checked={isIncludedInMaster}
                            onChange={(e) => {
                              onUpdateBoard?.(b.id, b.name, b.description || '', b.color, e.target.checked);
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                          />
                          <span>{isIncludedInMaster ? '⭐ En Master' : 'No en Master'}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingBoardId(b.id);
                            setEditBoardName(b.name);
                            setEditBoardDesc(b.description || '');
                            setEditBoardColor(b.color);
                            setEditBoardIncludeInMaster(b.includeInMaster !== false);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                          title="Cambiar nombre / Editar tablero"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {boards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteBoard(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Eliminar tablero"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: PLANIFICACIÓN ACTUAL */}
          {activeTab === 'planning' && (
            <div className="space-y-4">
              {/* Header card with Toggle */}
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
                    <CalendarRange className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sky-950">
                      Período de Planificación Actual
                    </h3>
                    <p className="text-xs text-sky-700 mt-0.5">
                      Filtra las tareas al horizonte actual con arrastre inteligente de pendientes
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={planningPeriod.enabled}
                    onChange={(e) => {
                      if (!onPlanningPeriodChange) return;
                      const willEnable = e.target.checked;
                      let start = planningPeriod.startDate;
                      let end = planningPeriod.endDate;
                      if (willEnable && (!start || !end)) {
                        const now = new Date();
                        const startD = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                        const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                        start = startD.toISOString();
                        end = endD.toISOString();
                      }
                      onPlanningPeriodChange({
                        ...planningPeriod,
                        enabled: willEnable,
                        startDate: start,
                        endDate: end,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* Carry-over rule explanation callout */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Regla de Continuidad y Arrastre de Tareas</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Al fijar las fechas del plan, tu tablero mostrará solo las tareas que inicien en ese rango.
                  <strong> Las tareas de planes anteriores que sigan activas (no completadas)</strong> se arrastrarán automáticamente a tu plan actual para no perder su ejecución. Las que ya fueron completadas quedarán archivadas en su período correspondiente.
                </p>
              </div>

              {/* Form settings */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Plan / Sprint (Opcional)
                  </label>
                  <input
                    type="text"
                    value={planningPeriod.name || ''}
                    placeholder="ej. Sprint 1 - Noviembre / Metas Q4"
                    onChange={(e) => {
                      if (onPlanningPeriodChange) {
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          name: e.target.value,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Accesos Rápidos de Rango
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (!onPlanningPeriodChange) return;
                        const now = new Date();
                        const day = now.getDay();
                        const diffToMonday = (day === 0 ? -6 : 1) - day;
                        const monday = new Date(now);
                        monday.setDate(now.getDate() + diffToMonday);
                        monday.setHours(0, 0, 0, 0);
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        sunday.setHours(23, 59, 59, 999);
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          enabled: true,
                          startDate: monday.toISOString(),
                          endDate: sunday.toISOString(),
                          name: planningPeriod.name || 'Esta Semana',
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 font-medium transition-all text-center cursor-pointer text-[11px]"
                    >
                      Esta Semana
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!onPlanningPeriodChange) return;
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const end = new Date(now);
                        end.setDate(now.getDate() + 14);
                        end.setHours(23, 59, 59, 999);
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          enabled: true,
                          startDate: now.toISOString(),
                          endDate: end.toISOString(),
                          name: planningPeriod.name || 'Próximos 15 Días',
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 font-medium transition-all text-center cursor-pointer text-[11px]"
                    >
                      Próximos 15 Días
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!onPlanningPeriodChange) return;
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          enabled: true,
                          startDate: start.toISOString(),
                          endDate: end.toISOString(),
                          name: planningPeriod.name || 'Este Mes',
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 font-medium transition-all text-center cursor-pointer text-[11px]"
                    >
                      Este Mes
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!onPlanningPeriodChange) return;
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
                        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          enabled: true,
                          startDate: start.toISOString(),
                          endDate: end.toISOString(),
                          name: planningPeriod.name || 'Próximo Mes',
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 font-medium transition-all text-center cursor-pointer text-[11px]"
                    >
                      Próximo Mes
                    </button>
                  </div>
                </div>

                {/* Date Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha de Inicio del Plan
                    </label>
                    <CustomDateTimePicker
                      value={planningPeriod.startDate || new Date().toISOString()}
                      onChange={(newStart) => {
                        if (!onPlanningPeriodChange) return;
                        let end = planningPeriod.endDate;
                        const startMs = new Date(newStart).getTime();
                        const endMs = end ? new Date(end).getTime() : 0;
                        // Auto-shift if end <= start
                        if (!end || endMs <= startMs) {
                          const shifted = new Date(startMs + 14 * 24 * 60 * 60 * 1000);
                          end = shifted.toISOString();
                        }
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          startDate: newStart,
                          endDate: end,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha de Fin del Plan
                    </label>
                    <CustomDateTimePicker
                      value={
                        planningPeriod.endDate ||
                        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                      }
                      minDate={planningPeriod.startDate}
                      onChange={(newEnd) => {
                        if (!onPlanningPeriodChange) return;
                        onPlanningPeriodChange({
                          ...planningPeriod,
                          endDate: newEnd,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Plan Tasks Preview Metrics */}
              {planningPeriod.startDate && planningPeriod.endDate && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Balance de Tareas para este Plan
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        planningPeriod.enabled
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {planningPeriod.enabled ? 'Filtro Activo' : 'Filtro Pausado'}
                    </span>
                  </div>

                  {(() => {
                    const startMs = new Date(planningPeriod.startDate).getTime();
                    const endMs = new Date(planningPeriod.endDate).getTime();
                    let inPeriod = 0;
                    let carriedOver = 0;
                    let archivedDone = 0;
                    let futureTasks = 0;

                    allTasks.forEach((t) => {
                      const tStart = new Date(t.startDate).getTime();
                      if (tStart >= startMs && tStart <= endMs) {
                        inPeriod++;
                      } else if (tStart < startMs) {
                        if (t.status !== 'done') {
                          carriedOver++;
                        } else {
                          archivedDone++;
                        }
                      } else if (tStart > endMs) {
                        futureTasks++;
                      }
                    });

                    const totalInCurrentPlan = inPeriod + carriedOver;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 bg-white rounded-xl border border-sky-200 shadow-2xs">
                          <span className="text-xl font-black text-sky-700">{totalInCurrentPlan}</span>
                          <p className="text-[10px] font-bold text-sky-900 uppercase mt-0.5">
                            Total en Plan Actual
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {inPeriod} nuevas + {carriedOver} arrastradas
                          </p>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
                          <span className="text-xl font-black text-amber-700">{carriedOver}</span>
                          <p className="text-[10px] font-bold text-amber-900 uppercase mt-0.5">
                            Pendientes Arrastradas
                          </p>
                          <p className="text-[9px] text-amber-700">De planes previos</p>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-xl font-black text-slate-600">{archivedDone}</span>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                            Completadas Previas
                          </p>
                          <p className="text-[9px] text-slate-400">Archivadas fuera de vista</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB: TYPES */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateType} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Nuevo Tipo de Tarea</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Diseño, Backend, QA..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-xl text-xs bg-white outline-none"
                  />
                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    className="w-9 h-9 p-1 border border-slate-300 rounded-xl cursor-pointer bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newTypeName.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {types.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.name}</span>
                    </div>
                    {types.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteType(t.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PRIORITIES */}
          {activeTab === 'priorities' && (
            <div className="space-y-4">
              <form onSubmit={handleCreatePriority} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Nueva Prioridad</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Crítica, Bloqueante..."
                    value={newPriorityName}
                    onChange={(e) => setNewPriorityName(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-xl text-xs bg-white outline-none"
                  />
                  <input
                    type="color"
                    value={newPriorityColor}
                    onChange={(e) => setNewPriorityColor(e.target.value)}
                    className="w-9 h-9 p-1 border border-slate-300 rounded-xl cursor-pointer bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newPriorityName.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {priorities.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                    </div>
                    {priorities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePriority(p.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: TAGS */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateTag} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Nueva Etiqueta</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Frontend, Bug, Sprint1..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-xl text-xs bg-white outline-none"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-9 h-9 p-1 border border-slate-300 rounded-xl cursor-pointer bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newTagName.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold"
                    style={{
                      backgroundColor: `${t.color}15`,
                      borderColor: `${t.color}40`,
                      color: t.color,
                    }}
                  >
                    <span>#{t.name}</span>
                    {tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteTag(t.id)}
                        className="opacity-60 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: THEME AND BACKGROUND TONE */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Selector de Tono de Fondo para descanso visual */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Tono de Fondo (Descanso Visual)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Elige el tono general de fondo para suavizar el brillo de la pantalla y descansar la vista en jornadas de trabajo prolongadas.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Cremita Cálido */}
                  <button
                    type="button"
                    onClick={() => onBgToneChange?.('cream')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      bgTone === 'cream'
                        ? 'border-amber-500 bg-[#faf8f2] shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-[#f6f5f0] border-2 border-amber-400 shadow-2xs flex items-center justify-center text-xs">
                          🍦
                        </span>
                        {bgTone === 'cream' && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Cremita Cálido</span>
                        <span className="text-[10px] text-amber-900 font-semibold inline-block bg-amber-100 px-1.5 py-0.5 rounded-md mt-0.5">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Tono arena cálido anti-reflejo. El más descansador para largas jornadas frente a la pantalla.
                      </p>
                    </div>
                    <div className="mt-3 h-3 rounded-lg bg-[#f0eee4] border border-amber-200/80 w-full" />
                  </button>

                  {/* Gris Suave */}
                  <button
                    type="button"
                    onClick={() => onBgToneChange?.('gray')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      bgTone === 'gray'
                        ? 'border-slate-600 bg-[#f4f6f9] shadow-xs ring-2 ring-slate-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-[#eef0f3] border-2 border-slate-400 shadow-2xs flex items-center justify-center text-xs">
                          🔘
                        </span>
                        {bgTone === 'gray' && (
                          <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Gris Suave</span>
                        <span className="text-[10px] text-slate-700 font-semibold inline-block bg-slate-200 px-1.5 py-0.5 rounded-md mt-0.5">
                          Mate Moderno
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Tono neutro mate relajante. Contraste balanceado y sobrio sin resplandor blanco.
                      </p>
                    </div>
                    <div className="mt-3 h-3 rounded-lg bg-[#e2e6eb] border border-slate-300/80 w-full" />
                  </button>

                  {/* Blanco Puro */}
                  <button
                    type="button"
                    onClick={() => onBgToneChange?.('white')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      bgTone === 'white'
                        ? 'border-blue-600 bg-white shadow-xs ring-2 ring-blue-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 shadow-2xs flex items-center justify-center text-xs">
                          ⚪
                        </span>
                        {bgTone === 'white' && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Blanco Puro</span>
                        <span className="text-[10px] text-slate-500 font-semibold inline-block bg-slate-100 px-1.5 py-0.5 rounded-md mt-0.5">
                          Clásico
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Fondo blanco luminoso de alto contraste clásico tradicional.
                      </p>
                    </div>
                    <div className="mt-3 h-3 rounded-lg bg-white border border-slate-200 w-full" />
                  </button>
                </div>
              </div>

              {/* Densidad y Temas */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Densidad Visual de la Interfaz
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ajusta el espaciado y tamaño general de la interfaz según tu preferencia.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LIGHT_THEMES.map((theme) => {
                    const isSelected = currentTheme.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{theme.name}</span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {theme.density}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            Listo
          </button>
        </div>
      </div>

      {/* Pre-Restore Full Overwrite Confirmation Modal */}
      {backupToRestoreConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  ¿Restaurar y sobreescribir datos locales?
                </h3>
                <p className="text-xs text-slate-500">
                  Esta acción reemplazará por completo la información de tu dispositivo actual por el respaldo seleccionado.
                </p>
              </div>
            </div>

            {/* Backup Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Fecha del Respaldo:</span>
                <span className="font-bold text-slate-900">{formatBackupDate(backupToRestoreConfirm.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Dispositivo de Origen:</span>
                <span className="font-bold text-slate-900">{backupToRestoreConfirm.deviceInfo || 'Nube'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 pt-1.5 border-t border-slate-200/80">
                <span className="font-semibold">Contenido a Cargar:</span>
                <span className="font-black text-indigo-700">
                  {backupToRestoreConfirm.taskCount} tareas • {backupToRestoreConfirm.boardCount} tableros
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium">
              ⚠️ <strong>Sobreescritura total:</strong> Las tareas actuales de este dispositivo se eliminarán y se reemplazarán al 100% por las del respaldo (sin duplicar ni fusionar).
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setBackupToRestoreConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={async () => {
                  if (!onRestoreCloudBackup || !backupToRestoreConfirm) return;
                  setIsRestoring(true);
                  try {
                    await onRestoreCloudBackup(backupToRestoreConfirm);
                    setBackupToRestoreConfirm(null);
                  } finally {
                    setIsRestoring(false);
                  }
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sobreescribiendo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Sí, Sobreescribir y Restaurar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Backup Confirmation Modal */}
      {backupToDeleteConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black text-slate-900">¿Eliminar este respaldo?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Se eliminará de la nube la copia del <strong>{formatBackupDate(backupToDeleteConfirm.createdAt)}</strong> con {backupToDeleteConfirm.taskCount} tareas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingBackup}
                onClick={() => setBackupToDeleteConfirm(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingBackup}
                onClick={async () => {
                  if (!onDeleteCloudBackup || !backupToDeleteConfirm) return;
                  setIsDeletingBackup(true);
                  try {
                    await onDeleteCloudBackup(backupToDeleteConfirm.id);
                    setBackupToDeleteConfirm(null);
                  } finally {
                    setIsDeletingBackup(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {isDeletingBackup ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Board Selection Modal Picker */}
      <OptionPickerModal
        isOpen={isExportBoardPickerOpen}
        title="Seleccionar Tablero a Exportar"
        subtitle="Elige si deseas exportar todos los tableros o uno en particular"
        icon={FolderKanban}
        options={[
          {
            id: 'all',
            label: `⭐ TODOS los Tableros (${boards.length} tableros)`,
            description: `Respaldo maestro con ${allTasks.length} tareas totales`,
          },
          ...boards.map((b) => ({
            id: b.id,
            label: `Tablero: ${b.name}`,
            description: `${allTasks.filter((t) => t.boardId === b.id || (!t.boardId && b.id === 'board-work')).length} tareas activas`,
            color: b.color,
          })),
        ]}
        selectedValue={selectedExportBoardId}
        onSelect={(id) => {
          setSelectedExportBoardId(id as string);
          setGeneratedBase64('');
        }}
        onClose={() => setIsExportBoardPickerOpen(false)}
      />
    </div>
  );
};
