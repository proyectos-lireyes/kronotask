import React, { useState } from 'react';
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
} from '../types';
import { LIGHT_THEMES } from '../services/storage';
import { TIME_COLOR_LEGEND } from '../utils/timeColor';
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
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  onAddBoard: (name: string, description: string, color: string) => void;
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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  boards,
  onAddBoard,
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
}) => {
  const [activeTab, setActiveTab] = useState<
    'boards' | 'transfer' | 'semaforo' | 'biometria' | 'types' | 'priorities' | 'tags' | 'theme'
  >('boards');

  // Form states
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('#2563eb');

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
    onAddBoard(newBoardName.trim(), newBoardDesc.trim(), newBoardColor);
    setNewBoardName('');
    setNewBoardDesc('');
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
    const boardToExport = boards.find((b) => b.id === selectedExportBoardId) || boards[0];
    if (!boardToExport) return;
    const base64 = exportBoardToBase64(boardToExport, allTasks, tags, types, priorities);
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
    const boardToExport = boards.find((b) => b.id === selectedExportBoardId) || boards[0];
    const blob = new Blob([generatedBase64], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kronotask-${(boardToExport?.name || 'tablero').toLowerCase().replace(/\s+/g, '-')}.kronotask`;
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
      setParsedPackage(parsed);

      // Check if board with same name exists
      const match = boards.find(
        (b) => b.name.trim().toLowerCase() === parsed.board.name.trim().toLowerCase()
      );
      if (match) {
        setImportResolution('merge'); // Suggest merge or overwrite
      } else {
        setImportResolution('new_board');
      }
      setImportNewBoardName(`${parsed.board.name} (Importado)`);
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
    const matchingBoard = boards.find(
      (b) => b.name.trim().toLowerCase() === parsedPackage.board.name.trim().toLowerCase()
    );

    onImportBoard({
      mode: importResolution,
      targetBoardId: matchingBoard?.id || boards[0]?.id,
      newBoardName: importNewBoardName.trim() || `${parsedPackage.board.name} (Importado)`,
      board: parsedPackage.board,
      tasks: parsedPackage.tasks,
      suffix: importSuffix,
    });

    setImportSuccessMsg(
      `✓ Tablero "${parsedPackage.board.name}" importado con éxito (${parsedPackage.tasks.length} tareas procesadas).`
    );
    setParsedPackage(null);
    setImportBase64Input('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ajustes Generales</h2>
              <p className="text-xs text-slate-500">
                Tableros, exportar/importar Base64, semáforo, biometría y diseño
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

        {/* Scrollable Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 sm:px-6 border-b border-slate-100 bg-white text-xs font-bold overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('boards')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'boards'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Tableros
          </button>

          {/* New Transfer Tab: Export & Import in Base64 */}
          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'transfer'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Compartir (Base64)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semaforo')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'semaforo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Semáforo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biometria')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'biometria'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
            Biometría
            {biometricRecord.registered && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('types')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'types'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tipos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('priorities')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'priorities'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Prioridades
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'tags'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Etiquetas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'theme'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Diseño
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB: EXPORT / IMPORT BASE64 */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
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
                    <select
                      value={selectedExportBoardId}
                      onChange={(e) => {
                        setSelectedExportBoardId(e.target.value);
                        setGeneratedBase64('');
                      }}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {boards.map((b) => {
                        const count = allTasks.filter(
                          (t) => t.boardId === b.id || (!t.boardId && b.id === 'board-work')
                        ).length;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.name} ({count} tareas)
                          </option>
                        );
                      })}
                    </select>

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
                              style={{ backgroundColor: parsedPackage.board.color }}
                            />
                            {parsedPackage.board.name}
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
              </form>

              <div className="space-y-2">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-2xs"
                        style={{ backgroundColor: b.color }}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{b.name}</span>
                        {b.description && (
                          <span className="text-[10px] text-slate-400">{b.description}</span>
                        )}
                      </div>
                    </div>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteBoard(b.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Eliminar tablero"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SEMÁFORO */}
          {activeTab === 'semaforo' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Semáforo de Tiempo Disponible
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  KronoTask calcula el porcentaje del plazo consumido entre la fecha de inicio y la fecha de entrega. La tarjeta cambia su color íntegramente y se ordenan por fecha de entrega más próxima.
                </p>
              </div>

              <div className="space-y-2">
                {TIME_COLOR_LEGEND.map((item) => (
                  <div
                    key={item.level}
                    className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full shadow-xs shrink-0"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${item.badgeBg}`}>
                            {item.range}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BIOMETRÍA */}
          {activeTab === 'biometria' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Fingerprint className="w-4 h-4 text-indigo-600" />
                  <span>Seguridad Biométrica (Huella Dactilar / FaceID)</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Protege tus tareas sensibles y bloquea la aplicación localmente en el dispositivo.
                </p>
              </div>

              {bioMsg && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    bioMsg.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {bioMsg.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{bioMsg.text}</span>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Estado de Biometría</p>
                      <p className="text-[11px] text-slate-500">
                        {biometricRecord.registered
                          ? `Enrolado: ${biometricRecord.userName || 'Usuario'} (${biometricRecord.registeredAt || 'Activo'})`
                          : 'No configurado en este navegador / dispositivo'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      biometricRecord.registered
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {biometricRecord.registered ? 'Protegido' : 'Inactivo'}
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  {!biometricRecord.registered ? (
                    <button
                      type="button"
                      disabled={bioLoading}
                      onClick={handleEnrollBio}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Fingerprint className="w-4 h-4" />
                      {bioLoading ? 'Registrando...' : 'Enrolar Huella / Clave Local'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={bioLoading}
                        onClick={handleTestBio}
                        className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Probar Autenticación
                      </button>

                      <button
                        type="button"
                        onClick={handleLockNow}
                        className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-4 h-4" />
                        Bloquear Pantalla Ahora
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveBio}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Desactivar
                      </button>
                    </>
                  )}
                </div>
              </div>
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

          {/* TAB: THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
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
    </div>
  );
};
