export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'in_review' | 'done';

export type TimeColorLevel = 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'black';

export type RecurrenceUnit = 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface RecurrenceRule {
  enabled: boolean;
  interval: number;
  unit: RecurrenceUnit;
  nextTriggerDate?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  reactions?: Record<string, number>;
}

export interface CustomTag {
  id: string;
  name: string;
  color: string;
}

export interface CustomTypeDefinition {
  id: string;
  name: string;
  color: string;
  iconName?: string;
}

export interface CustomPriorityDefinition {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  level: number; // 1 to 5
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface TaskReminder {
  id: string;
  offsetMinutes: number;
  label: string;
  notified?: boolean;
}

export interface TaskItem {
  id: string;
  boardId: string; // e.g. 'board-work', 'board-uni', 'board-personal'
  title: string;
  description: string;
  status: TaskStatus;
  waitingSince?: string | null; // ISO string when entered 'waiting' status
  startDate: string; // ISO string
  endDate: string; // ISO string (deadline)
  completedAt?: string | null;
  priority: string; // matches CustomPriorityDefinition.id or name
  type: string; // matches CustomTypeDefinition.id or name
  tags: string[];
  recurrence?: RecurrenceRule;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  reminders: TaskReminder[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface LightThemeConfig {
  id: string;
  name: string;
  primaryColor: string;
  cardRadius: 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl';
  density: 'compact' | 'normal' | 'comfortable';
  headerColor: string;
  accentBg: string;
}

export interface BiometricRecord {
  registered: boolean;
  credentialId?: string;
  userName?: string;
  registeredAt?: string;
  lastAuthenticated?: string;
}

export interface ComplianceMetrics {
  totalTasks: number;
  completedTasks: number;
  completedOnTime: number;
  completedLate: number;
  pendingOnTime: number;
  overdueTasks: number;
  complianceRate: number;
  averageCompletionHours: number;
}

export type ImportResolutionMode = 'overwrite' | 'merge' | 'new_board';

export interface ImportBoardAction {
  mode: ImportResolutionMode;
  targetBoardId?: string;
  newBoardName?: string;
  board: Board;
  tasks: TaskItem[];
  suffix?: string;
}

