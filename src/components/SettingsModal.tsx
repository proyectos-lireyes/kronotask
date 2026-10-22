import React, { useState } from 'react';
import {
  Board,
  CustomPriorityDefinition,
  CustomTag,
  CustomTypeDefinition,
  LightThemeConfig,
  BiometricRecord,
  UserProfile,
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
}) => {
  const [activeTab, setActiveTab] = useState<'boards' | 'types' | 'priorities' | 'tags' | 'semaforo' | 'biometria' | 'theme'>('boards');

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

  // Biometrics actions
  const handleRegisterBiometrics = async () => {
    setBioLoading(true);
    setBioMsg(null);
    try {
      const userName = currentUser?.email || 'usuario@chronotask.app';
      await registerBiometricCredential(userName);
      setBioMsg({ text: '✓ Autenticación biométrica configurada exitosamente.', isError: false });
      onBiometricStatusChange();
    } catch (err: any) {
      setBioMsg({ text: err.message || 'Error al configurar biometría', isError: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleTestVerifyBiometrics = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ajustes Generales</h2>
              <p className="text-xs text-slate-500">Tableros, semáforo, biometría, prioridades y diseño</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Tabs (Pocket optimized) */}
        <div className="flex items-center gap-1 px-3 sm:px-6 border-b border-slate-100 bg-white text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('boards')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'boards' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Tableros
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semaforo')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'semaforo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Semáforo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biometria')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'biometria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
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
              activeTab === 'types' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tipos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('priorities')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'priorities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Prioridades
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'tags' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Etiquetas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'theme' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Tema
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[calc(80vh-130px)] overflow-y-auto">
          {/* TAB: TABLEROS */}
          {activeTab === 'boards' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateBoard} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Crear Nuevo Tablero
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre (ej. Gimnasio)"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Descripción..."
                    value={newBoardDesc}
                    onChange={(e) => setNewBoardDesc(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBoardColor}
                      onChange={(e) => setNewBoardColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                    />
                    <button
                      type="submit"
                      className="flex-1 py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-2">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                        {b.description && <p className="text-[11px] text-slate-500">{b.description}</p>}
                      </div>
                    </div>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteBoard(b.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SEMAFORO DE TIEMPO */}
          {activeTab === 'semaforo' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
                El color de cada tarjeta se calcula comparando el tiempo transcurrido entre la <strong>Fecha de Inicio</strong> y la <strong>Fecha Límite</strong>. De verde a rojo según el % consumido, y negro automático al vencer:
              </div>

              <div className="space-y-2">
                {TIME_COLOR_LEGEND.map((item) => (
                  <div
                    key={item.level}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="w-3.5 h-10 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.colorHex }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.range}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: BIOMETRIA */}
          {activeTab === 'biometria' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Protección Biométrica:</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      biometricRecord.registered
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {biometricRecord.registered ? '✓ Activa' : 'Desactivada'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Permite bloquear y desbloquear tu tablero Kanban de forma segura mediante Touch ID, Face ID o sensor de huella.
                </p>
                {biometricRecord.registered && biometricRecord.registeredAt && (
                  <p className="text-[10px] text-slate-400">
                    Registrada el: {new Date(biometricRecord.registeredAt).toLocaleString()}
                  </p>
                )}
              </div>

              {bioMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    bioMsg.isError ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {bioMsg.isError ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  <span>{bioMsg.text}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {!biometricRecord.registered ? (
                  <button
                    type="button"
                    disabled={bioLoading}
                    onClick={handleRegisterBiometrics}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Fingerprint className="w-4 h-4" />
                    {bioLoading ? 'Configurando...' : 'Activar Biometría en este Equipo'}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={bioLoading}
                      onClick={handleTestVerifyBiometrics}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Probar Sensor
                    </button>
                    <button
                      type="button"
                      onClick={handleLockNow}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      Bloquear Ahora
                    </button>
                  </div>
                )}

                {biometricRecord.registered && (
                  <button
                    type="button"
                    onClick={handleRemoveBio}
                    className="w-full text-center text-xs text-rose-600 hover:underline pt-2 font-medium cursor-pointer"
                  >
                    Eliminar registro biométrico
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: TYPES */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateType} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Nuevo Tipo de Tarea
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre (ej. Reunión, Soporte)..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {types.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-bold text-slate-800 truncate">{t.name}</span>
                    </div>
                    {types.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteType(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
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
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Añadir Prioridad
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre (ej. Máxima, Opcional)..."
                    value={newPriorityName}
                    onChange={(e) => setNewPriorityName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <input
                    type="color"
                    value={newPriorityColor}
                    onChange={(e) => setNewPriorityColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    Guardar
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {priorities.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Flag className="w-3.5 h-3.5" style={{ color: p.color }} />
                      <span className="font-bold text-slate-800 capitalize">{p.name}</span>
                    </div>
                    {priorities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePriority(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
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
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Nueva Etiqueta
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre etiqueta..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
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

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
