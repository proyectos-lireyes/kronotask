import {
  Board,
  CustomPriorityDefinition,
  CustomTag,
  CustomTypeDefinition,
  LightThemeConfig,
  TaskItem,
  QuadrantConfig,
  DEFAULT_QUADRANT_CONFIG,
} from '../types';

const STORAGE_TASKS_KEY = 'kronotask_tasks_v5';
const STORAGE_TAGS_KEY = 'kronotask_tags_v5';
const STORAGE_BOARDS_KEY = 'kronotask_boards_v5';
const STORAGE_TYPES_KEY = 'kronotask_types_v5';
const STORAGE_PRIORITIES_KEY = 'kronotask_priorities_v5';
const STORAGE_THEME_KEY = 'kronotask_theme_v5';

export const DEFAULT_BOARDS: Board[] = [
  {
    id: 'board-work',
    name: 'Principal',
    description: 'Tablero principal de tareas',
    color: '#2563eb',
    icon: 'Briefcase',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_TAGS: CustomTag[] = [];

export const DEFAULT_TYPES: CustomTypeDefinition[] = [
  { id: 'tarea', name: 'Tarea', color: '#64748b' },
  { id: 'evento', name: 'Evento', color: '#8b5cf6', iconName: 'Calendar' },
  { id: 'caracteristica', name: 'Función', color: '#2563eb' },
  { id: 'bug', name: 'Bug / Error', color: '#e11d48' },
  { id: 'hito', name: 'Hito', color: '#7c3aed' },
  { id: 'mantenimiento', name: 'Mantenimiento', color: '#d97706' },
  { id: 'investigacion', name: 'Investigación', color: '#059669' },
];

export const DEFAULT_PRIORITIES: CustomPriorityDefinition[] = [
  { id: 'baja', name: 'Baja', color: '#64748b', badgeBg: 'bg-slate-100 text-slate-700', level: 1 },
  { id: 'media', name: 'Media', color: '#2563eb', badgeBg: 'bg-blue-50 text-blue-700', level: 2 },
  { id: 'alta', name: 'Alta', color: '#d97706', badgeBg: 'bg-amber-50 text-amber-800', level: 3 },
  { id: 'urgente', name: 'Urgente', color: '#ea580c', badgeBg: 'bg-orange-100 text-orange-900', level: 4 },
  { id: 'critica', name: 'Crítica', color: '#e11d48', badgeBg: 'bg-rose-100 text-rose-900 font-bold', level: 5 },
];

export const LIGHT_THEMES: LightThemeConfig[] = [
  {
    id: 'slate-blue',
    name: 'Azul Ejecutivo',
    primaryColor: 'blue',
    cardRadius: 'rounded-xl',
    density: 'normal',
    headerColor: 'bg-white/95 backdrop-blur-md border-b border-slate-200/80',
    accentBg: 'bg-slate-50',
  },
  {
    id: 'emerald-mint',
    name: 'Menta Fresca',
    primaryColor: 'emerald',
    cardRadius: 'rounded-2xl',
    density: 'comfortable',
    headerColor: 'bg-emerald-50/95 backdrop-blur-md border-b border-emerald-200/80',
    accentBg: 'bg-emerald-50/30',
  },
  {
    id: 'warm-amber',
    name: 'Ámbar Cálido',
    primaryColor: 'amber',
    cardRadius: 'rounded-lg',
    density: 'normal',
    headerColor: 'bg-amber-50/95 backdrop-blur-md border-b border-amber-200/80',
    accentBg: 'bg-amber-50/30',
  },
  {
    id: 'soft-violet',
    name: 'Lavanda Moderna',
    primaryColor: 'violet',
    cardRadius: 'rounded-xl',
    density: 'normal',
    headerColor: 'bg-violet-50/95 backdrop-blur-md border-b border-violet-200/80',
    accentBg: 'bg-violet-50/30',
  },
  {
    id: 'clean-minimal',
    name: 'Blanco Puro / Minimal',
    primaryColor: 'slate',
    cardRadius: 'rounded-lg',
    density: 'compact',
    headerColor: 'bg-white border-b border-stone-200',
    accentBg: 'bg-stone-50/50',
  },
];

export function getInitialTasks(): TaskItem[] {
  return [];
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading tasks:', e);
  }
  return [];
}

export function saveTasks(tasks: TaskItem[]) {
  try {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks:', e);
  }
}

export function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_BOARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_BOARDS;
}

export function saveBoards(boards: Board[]) {
  try {
    localStorage.setItem(STORAGE_BOARDS_KEY, JSON.stringify(boards));
  } catch (e) {
    console.error(e);
  }
}

const STORAGE_ACCEPTED_COLLISIONS_KEY = 'kronotask_accepted_collisions_v5';

export function loadCustomTypes(): CustomTypeDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure 'tarea' is at index 0 and always available
        const hasTarea = parsed.some(
          (t: CustomTypeDefinition) => t.id === 'tarea' || t.name?.toLowerCase() === 'tarea'
        );
        if (!hasTarea) {
          parsed.unshift({ id: 'tarea', name: 'Tarea', color: '#64748b' });
        }
        const tareaIdx = parsed.findIndex((t: CustomTypeDefinition) => t.id === 'tarea');
        if (tareaIdx > 0) {
          const [tItem] = parsed.splice(tareaIdx, 1);
          parsed.unshift(tItem);
        }

        // Ensure 'evento' type is also available
        const hasEvento = parsed.some(
          (t: CustomTypeDefinition) => t.id === 'evento' || t.name?.toLowerCase() === 'evento'
        );
        if (!hasEvento) {
          parsed.push({ id: 'evento', name: 'Evento', color: '#8b5cf6', iconName: 'Calendar' });
        }
        saveCustomTypes(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_TYPES;
}

export function saveCustomTypes(types: CustomTypeDefinition[]) {
  try {
    localStorage.setItem(STORAGE_TYPES_KEY, JSON.stringify(types));
  } catch (e) {
    console.error(e);
  }
}

export function loadAcceptedCollisions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCEPTED_COLLISIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveAcceptedCollisions(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_ACCEPTED_COLLISIONS_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error(e);
  }
}

export function loadCustomPriorities(): CustomPriorityDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_PRIORITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_PRIORITIES;
}

export function saveCustomPriorities(priorities: CustomPriorityDefinition[]) {
  try {
    localStorage.setItem(STORAGE_PRIORITIES_KEY, JSON.stringify(priorities));
  } catch (e) {
    console.error(e);
  }
}

export function loadTags(): CustomTag[] {
  try {
    const raw = localStorage.getItem(STORAGE_TAGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_TAGS;
}

export function saveTags(tags: CustomTag[]) {
  try {
    localStorage.setItem(STORAGE_TAGS_KEY, JSON.stringify(tags));
  } catch (e) {
    console.error(e);
  }
}

export function loadTheme(): LightThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return LIGHT_THEMES[0];
}

export function saveTheme(theme: LightThemeConfig) {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, JSON.stringify(theme));
  } catch (e) {
    console.error(e);
  }
}

const STORAGE_QUADRANT_CONFIG_KEY = 'kronotask_quadrant_config_v5';

export function loadQuadrantConfig(): QuadrantConfig {
  try {
    const raw = localStorage.getItem(STORAGE_QUADRANT_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.q1Days === 'number') {
        return {
          ...DEFAULT_QUADRANT_CONFIG,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error('Error loading quadrant config:', e);
  }
  return DEFAULT_QUADRANT_CONFIG;
}

export function saveQuadrantConfig(config: QuadrantConfig) {
  try {
    localStorage.setItem(STORAGE_QUADRANT_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving quadrant config:', e);
  }
}

