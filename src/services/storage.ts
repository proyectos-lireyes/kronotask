import {
  Board,
  CustomPriorityDefinition,
  CustomTag,
  CustomTypeDefinition,
  LightThemeConfig,
  TaskItem,
} from '../types';

const STORAGE_TASKS_KEY = 'chronotask_tasks_v3';
const STORAGE_TAGS_KEY = 'chronotask_tags_v3';
const STORAGE_BOARDS_KEY = 'chronotask_boards_v3';
const STORAGE_TYPES_KEY = 'chronotask_types_v3';
const STORAGE_PRIORITIES_KEY = 'chronotask_priorities_v3';
const STORAGE_THEME_KEY = 'chronotask_theme_v3';

export const DEFAULT_BOARDS: Board[] = [
  {
    id: 'board-work',
    name: 'Trabajo',
    description: 'Proyectos corporativos, entregas de clientes y reuniones',
    color: '#2563eb',
    icon: 'Briefcase',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'board-uni',
    name: 'Universidad',
    description: 'Materias, exámenes, tesis y tareas académicas',
    color: '#7c3aed',
    icon: 'GraduationCap',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'board-personal',
    name: 'Personal',
    description: 'Metas personales, finanzas, salud y hogar',
    color: '#059669',
    icon: 'User',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_TAGS: CustomTag[] = [
  { id: 'tag-1', name: 'Desarrollo', color: '#2563eb' },
  { id: 'tag-2', name: 'Diseño UX', color: '#8b5cf6' },
  { id: 'tag-3', name: 'Exámenes', color: '#ec4899' },
  { id: 'tag-4', name: 'Investigación', color: '#10b981' },
  { id: 'tag-5', name: 'Hogar', color: '#f59e0b' },
];

export const DEFAULT_TYPES: CustomTypeDefinition[] = [
  { id: 'evento', name: 'Evento', color: '#8b5cf6', iconName: 'Calendar' },
  { id: 'tarea', name: 'Tarea', color: '#64748b' },
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
  const now = Date.now();
  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  return [
    {
      id: 'task-work-1',
      boardId: 'board-work',
      title: 'Planificación Estratégica Trimestral',
      description: 'Definición de OKRs y asignación de equipo para el siguiente ciclo.',
      status: 'todo',
      startDate: new Date(now - hour * 3).toISOString(),
      endDate: new Date(now + day * 6).toISOString(), // Green (< 25%)
      priority: 'media',
      type: 'hito',
      tags: ['Desarrollo'],
      recurrence: { enabled: true, interval: 1, unit: 'months' },
      attachments: [],
      comments: [],
      reminders: [{ id: 'rem-1', offsetMinutes: 60, label: '1 hora antes' }],
      createdAt: new Date(now - hour * 3).toISOString(),
      updatedAt: new Date(now - hour * 3).toISOString(),
    },
    {
      id: 'task-work-2',
      boardId: 'board-work',
      title: 'Implementación de API Backend v2',
      description: 'Nuevos endpoints REST para la sincronización móvil en tiempo real.',
      status: 'in_progress',
      startDate: new Date(now - day * 2).toISOString(),
      endDate: new Date(now + day * 3).toISOString(), // Blue (25-49%)
      priority: 'alta',
      type: 'caracteristica',
      tags: ['Desarrollo'],
      attachments: [],
      comments: [
        {
          id: 'comm-1',
          authorName: 'Carlos Dev',
          authorEmail: 'carlos@empresa.com',
          content: 'Endpoints de usuarios completados.',
          createdAt: new Date(now - hour * 4).toISOString(),
        },
      ],
      reminders: [{ id: 'rem-2', offsetMinutes: 30, label: '30 min antes' }],
      createdAt: new Date(now - day * 2).toISOString(),
      updatedAt: new Date(now - hour * 4).toISOString(),
    },
    {
      id: 'task-work-waiting',
      boardId: 'board-work',
      title: 'Aprobación de Presupuesto con Gerencia',
      description: 'En espera de visto bueno del director financiero. Tiene máximo 4 días antes de reactivarse.',
      status: 'waiting',
      waitingSince: new Date(now - day * 1.5).toISOString(), // Started waiting 1.5 days ago (2.5 days left)
      startDate: new Date(now - day * 2).toISOString(),
      endDate: new Date(now + day * 4).toISOString(),
      priority: 'urgente',
      type: 'tarea',
      tags: ['Desarrollo'],
      attachments: [],
      comments: [
        {
          id: 'comm-w1',
          authorName: 'Coordinador',
          authorEmail: 'pm@empresa.com',
          content: 'Documento enviado a gerencia. En espera de respuesta.',
          createdAt: new Date(now - day * 1.5).toISOString(),
        },
      ],
      reminders: [],
      createdAt: new Date(now - day * 2).toISOString(),
      updatedAt: new Date(now - day * 1.5).toISOString(),
    },
    {
      id: 'task-work-3',
      boardId: 'board-work',
      title: 'Revisión de Seguridad y Cifrado',
      description: 'Auditoría de políticas de acceso y tokens biométricos.',
      status: 'in_review',
      startDate: new Date(now - day * 3).toISOString(),
      endDate: new Date(now + day * 1.5).toISOString(), // Yellow (50-74%)
      priority: 'urgente',
      type: 'mantenimiento',
      tags: ['Desarrollo'],
      attachments: [],
      comments: [],
      reminders: [],
      createdAt: new Date(now - day * 3).toISOString(),
      updatedAt: new Date(now - day * 3).toISOString(),
    },
    {
      id: 'task-uni-1',
      boardId: 'board-uni',
      title: 'Capítulo 3 de Tesis: Metodología',
      description: 'Redacción de metodología cuantitativa y diseño de pruebas estadísticas.',
      status: 'in_progress',
      startDate: new Date(now - day * 4).toISOString(),
      endDate: new Date(now + hour * 14).toISOString(), // Orange (75-89%)
      priority: 'alta',
      type: 'investigacion',
      tags: ['Investigación'],
      attachments: [],
      comments: [],
      reminders: [{ id: 'rem-uni-1', offsetMinutes: 45, label: '45 min antes' }],
      createdAt: new Date(now - day * 4).toISOString(),
      updatedAt: new Date(now - day * 4).toISOString(),
    },
    {
      id: 'task-uni-2',
      boardId: 'board-uni',
      title: 'Entrega de Tarea de Inteligencia Artificial',
      description: 'Implementación del algoritmo A* y heurísticas de búsqueda.',
      status: 'todo',
      startDate: new Date(now - day * 2).toISOString(),
      endDate: new Date(now + hour * 2).toISOString(), // Red (90-99%)
      priority: 'critica',
      type: 'tarea',
      tags: ['Exámenes'],
      attachments: [],
      comments: [],
      reminders: [{ id: 'rem-uni-2', offsetMinutes: 15, label: '15 min antes' }],
      createdAt: new Date(now - day * 2).toISOString(),
      updatedAt: new Date(now - day * 2).toISOString(),
    },
    {
      id: 'event-work-1',
      boardId: 'board-work',
      title: 'Demo de Lanzamiento con Inversionistas',
      description: 'Evento sincrónico clave con la junta directiva y clientes prioritarios.',
      status: 'in_progress',
      startDate: new Date(now + hour * 1).toISOString(),
      endDate: new Date(now + hour * 3).toISOString(),
      priority: 'critica',
      type: 'evento',
      tags: ['Desarrollo'],
      attachments: [],
      comments: [],
      reminders: [{ id: 'rem-ev-1', offsetMinutes: 30, label: '30 min antes' }],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
    {
      id: 'event-uni-1',
      boardId: 'board-uni',
      title: 'Defensa de Tesis de Grado (Evento)',
      description: 'Sustentación sincrónica con el tribunal académico. Choque potencial de eventos entre Trabajo y Universidad.',
      status: 'in_progress',
      startDate: new Date(now + hour * 2).toISOString(),
      endDate: new Date(now + hour * 4).toISOString(),
      priority: 'urgente',
      type: 'evento',
      tags: ['Exámenes'],
      attachments: [],
      comments: [],
      reminders: [{ id: 'rem-ev-2', offsetMinutes: 15, label: '15 min antes' }],
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
    {
      id: 'task-personal-1',
      boardId: 'board-personal',
      title: 'Mantenimiento Preventivo de Vehículo',
      description: 'Superó la fecha límite recomendada de revisión.',
      status: 'todo',
      startDate: new Date(now - day * 4).toISOString(),
      endDate: new Date(now - hour * 5).toISOString(), // Black (Overdue)
      priority: 'alta',
      type: 'mantenimiento',
      tags: ['Hogar'],
      attachments: [],
      comments: [],
      reminders: [],
      createdAt: new Date(now - day * 4).toISOString(),
      updatedAt: new Date(now - hour * 5).toISOString(),
    },
    {
      id: 'task-historial-done',
      boardId: 'board-work',
      title: 'Setup de Servidores y Dominio SSL',
      description: 'Completado y archivado en el Historial de cumplimiento.',
      status: 'done',
      completedAt: new Date(now - day * 2).toISOString(),
      startDate: new Date(now - day * 8).toISOString(),
      endDate: new Date(now - day * 1).toISOString(),
      priority: 'media',
      type: 'hito',
      tags: ['Desarrollo'],
      attachments: [],
      comments: [],
      reminders: [],
      createdAt: new Date(now - day * 8).toISOString(),
      updatedAt: new Date(now - day * 2).toISOString(),
    },
  ];
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading tasks:', e);
  }
  const initial = getInitialTasks();
  saveTasks(initial);
  return initial;
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

const STORAGE_ACCEPTED_COLLISIONS_KEY = 'chronotask_accepted_collisions_v1';

export function loadCustomTypes(): CustomTypeDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure 'evento' type is always available
        const hasEvento = parsed.some(
          (t: CustomTypeDefinition) => t.id === 'evento' || t.name?.toLowerCase() === 'evento'
        );
        if (!hasEvento) {
          parsed.unshift({ id: 'evento', name: 'Evento', color: '#8b5cf6', iconName: 'Calendar' });
          saveCustomTypes(parsed);
        }
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
