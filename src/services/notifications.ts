import { TaskItem } from '../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'reminder' | 'warning' | 'overdue' | 'success' | 'info';
  timestamp: string;
  taskId?: string;
}

class SoundService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playChime(type: 'reminder' | 'overdue' | 'complete' | 'click') {
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      if (type === 'complete') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.45);
        });
      } else if (type === 'overdue') {
        [440, 370].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.15, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.4);
        });
      } else if (type === 'reminder') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

export const soundService = new SoundService();

let isChannelCreated = false;

async function setupAndroidNotificationChannel() {
  if (Capacitor.isNativePlatform() && !isChannelCreated) {
    try {
      await LocalNotifications.createChannel({
        id: 'kronotask_alerts',
        name: 'Recordatorios KronoTask',
        description: 'Alertas de vencimiento y avisos de entrega',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      isChannelCreated = true;
    } catch (e) {
      console.warn('Could not register Android notification channel:', e);
    }
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      await setupAndroidNotificationChannel();
      return res.display === 'granted' ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Error requesting native permissions:', e);
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

let notificationIdTracker = 1000;

export async function sendPushNotification(title: string, options?: NotificationOptions) {
  // If running in Capacitor Android, trigger native OS notification
  if (Capacitor.isNativePlatform()) {
    try {
      await setupAndroidNotificationChannel();
      notificationIdTracker = (notificationIdTracker + 1) % 999999;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 100000) + notificationIdTracker,
            title,
            body: options?.body || '',
            channelId: 'kronotask_alerts',
            schedule: { at: new Date(Date.now() + 150) },
          },
        ],
      });
      return;
    } catch (e) {
      console.warn('Capacitor LocalNotification failed, falling back to web:', e);
    }
  }

  // Web Notification fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.warn('Error sending native web notification:', e);
    }
  }
}

const notifiedEventsCache = new Set<string>();
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoString;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'todo':
      return 'Por Hacer';
    case 'in_progress':
      return 'En Progreso';
    case 'waiting':
      return 'En Espera';
    case 'in_review':
      return 'En Revisión';
    case 'done':
      return 'Completada';
    default:
      return status;
  }
}

function buildTaskBody(task: TaskItem, extraInfo?: string): string {
  const sTime = formatTime(task.startDate);
  const eTime = formatTime(task.endDate);
  const stLabel = getStatusLabel(task.status);
  const base = `⏰ Inicio: ${sTime} - Fin: ${eTime} | Estado: ${stLabel}`;
  return extraInfo ? `${base}\n${extraInfo}` : base;
}

export function checkTaskRemindersAndSchedules(
  tasks: TaskItem[],
  onInAppNotification: (notif: InAppNotification) => void,
  onAutoReactivateWaitingTask: (taskId: string) => void
) {
  const now = Date.now();
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // 1. Check "En Espera" auto reactivation after 4 days
  tasks.forEach((task) => {
    if (task.status === 'waiting' && task.waitingSince) {
      const waitingStartTime = new Date(task.waitingSince).getTime();
      const waitingElapsed = now - waitingStartTime;

      if (waitingElapsed >= FOUR_DAYS_MS) {
        soundService.playChime('reminder');
        const bodyText = buildTaskBody(task, `Estuvo en espera durante 4 días. Cambiada a 'En Progreso'.`);
        sendPushNotification(`⚡ Reactivación Automática: ${task.title}`, {
          body: bodyText,
        });
        onInAppNotification({
          id: `reactivate-${task.id}-${now}`,
          title: `Reactivación: ${task.title}`,
          body: bodyText,
          type: 'info',
          timestamp: new Date().toISOString(),
          taskId: task.id,
        });
        onAutoReactivateWaitingTask(task.id);
      }
    }
  });

  // 2. Daily Briefing Check (Tasks due today)
  const dailyBriefingKey = `daily-briefing-${todayDateStr}`;
  if (!notifiedEventsCache.has(dailyBriefingKey)) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const tasksToday = tasks.filter((t) => {
      if (t.status === 'done') return false;
      const end = new Date(t.endDate).getTime();
      return end >= startOfToday.getTime() && end <= endOfToday.getTime();
    });

    if (tasksToday.length > 0) {
      notifiedEventsCache.add(dailyBriefingKey);
      const briefingBody = tasksToday
        .map((t) => `• ${t.title}\n  Inicio: ${formatTime(t.startDate)} - Fin: ${formatTime(t.endDate)} | Estado: ${getStatusLabel(t.status)}`)
        .join('\n\n');

      sendPushNotification(`📅 Agenda de Hoy: ${tasksToday.length} tarea(s)`, {
        body: briefingBody,
      });
      onInAppNotification({
        id: `daily-note-${todayDateStr}`,
        title: `📅 Agenda de Hoy (${tasksToday.length} tareas)`,
        body: briefingBody,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Monday Weekly Briefing Check
  const isMonday = new Date().getDay() === 1;
  const weeklyBriefingKey = `weekly-briefing-${todayDateStr}`;
  if (isMonday && !notifiedEventsCache.has(weeklyBriefingKey)) {
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const tasksThisWeek = tasks.filter((t) => {
      if (t.status === 'done') return false;
      const end = new Date(t.endDate).getTime();
      return end >= now && end <= sunday.getTime();
    });

    if (tasksThisWeek.length > 0) {
      notifiedEventsCache.add(weeklyBriefingKey);
      const weeklyBody = tasksThisWeek
        .slice(0, 5)
        .map((t) => `• ${t.title} (${formatTime(t.startDate)} - ${formatTime(t.endDate)}) [${getStatusLabel(t.status)}]`)
        .join('\n');

      sendPushNotification(`🗓️ Resumen Semanal: ${tasksThisWeek.length} tareas`, {
        body: weeklyBody,
      });
      onInAppNotification({
        id: `weekly-note-${todayDateStr}`,
        title: `🗓️ Resumen Semanal (${tasksThisWeek.length} tareas)`,
        body: weeklyBody,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 4. Task Start Time & Deadline Reminders
  tasks.forEach((task) => {
    if (task.status === 'done') return;

    const start = new Date(task.startDate).getTime();
    const end = new Date(task.endDate).getTime();

    const startDiffMinutes = Math.floor((start - now) / (60 * 1000));
    const endDiffMinutes = Math.floor((end - now) / (60 * 1000));

    // A) START TIME REMINDERS & NOTIFICATIONS
    if (task.reminders && task.reminders.length > 0) {
      task.reminders.forEach((rem) => {
        const startRemKey = `rem-start-${task.id}-${rem.offsetMinutes}`;
        if (!notifiedEventsCache.has(startRemKey)) {
          if (startDiffMinutes <= rem.offsetMinutes && startDiffMinutes >= rem.offsetMinutes - 2) {
            notifiedEventsCache.add(startRemKey);
            soundService.playChime('reminder');
            const body = buildTaskBody(task, `Inicia en ${rem.offsetMinutes} minutos.`);
            sendPushNotification(`🚀 Inicia Pronto: ${task.title}`, { body });
            onInAppNotification({
              id: `notif-start-${Date.now()}-${Math.random()}`,
              title: `🚀 Inicia Pronto: ${task.title}`,
              body,
              type: 'reminder',
              timestamp: new Date().toISOString(),
              taskId: task.id,
            });
          }
        }
      });
    }

    // Task Start Time Exact Alert
    const startExactKey = `start-exact-${task.id}`;
    if (startDiffMinutes <= 0 && startDiffMinutes >= -3 && !notifiedEventsCache.has(startExactKey)) {
      notifiedEventsCache.add(startExactKey);
      soundService.playChime('reminder');
      const body = buildTaskBody(task, `Llegó la hora de inicio programada.`);
      sendPushNotification(`▶️ ¡Hora de Iniciar!: ${task.title}`, { body });
      onInAppNotification({
        id: `notif-startexact-${Date.now()}-${Math.random()}`,
        title: `▶️ ¡Hora de Iniciar!: ${task.title}`,
        body,
        type: 'info',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }

    // Task Start Passed but Still in "Por Hacer"
    const unstartedPendingKey = `unstarted-${task.id}-${todayDateStr}`;
    if (now > start && task.status === 'todo' && !notifiedEventsCache.has(unstartedPendingKey)) {
      notifiedEventsCache.add(unstartedPendingKey);
      soundService.playChime('reminder');
      const body = buildTaskBody(task, `Hora de inicio transcurrida; sigue en 'Por Hacer'.`);
      sendPushNotification(`⚠️ Inicio Pendiente: ${task.title}`, { body });
      onInAppNotification({
        id: `notif-unstarted-${Date.now()}-${Math.random()}`,
        title: `⚠️ Tarea por Iniciar: ${task.title}`,
        body,
        type: 'warning',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }

    // B) END TIME / DEADLINE REMINDERS & NOTIFICATIONS
    if (task.reminders && task.reminders.length > 0) {
      task.reminders.forEach((rem) => {
        const endRemKey = `rem-end-${task.id}-${rem.offsetMinutes}`;
        if (!notifiedEventsCache.has(endRemKey)) {
          if (endDiffMinutes <= rem.offsetMinutes && endDiffMinutes >= rem.offsetMinutes - 2) {
            notifiedEventsCache.add(endRemKey);
            soundService.playChime('reminder');
            const body = buildTaskBody(task, `Faltan ${rem.offsetMinutes} minutos para la fecha límite.`);
            sendPushNotification(`⏰ Recordatorio Vencimiento: ${task.title}`, { body });
            onInAppNotification({
              id: `notif-end-${Date.now()}-${Math.random()}`,
              title: `Recordatorio: ${task.title}`,
              body,
              type: 'reminder',
              timestamp: new Date().toISOString(),
              taskId: task.id,
            });
          }
        }
      });
    }

    // Imminent warning (< 15 min to deadline)
    const imminentKey = `imminent-${task.id}`;
    if (endDiffMinutes <= 15 && endDiffMinutes > 0 && !notifiedEventsCache.has(imminentKey)) {
      notifiedEventsCache.add(imminentKey);
      soundService.playChime('reminder');
      const body = buildTaskBody(task, `Quedan ${endDiffMinutes} minutos para el plazo límite.`);
      sendPushNotification(`⚠️ Vencimiento Próximo: ${task.title}`, { body });
      onInAppNotification({
        id: `notif-${Date.now()}-${Math.random()}`,
        title: `Vencimiento Próximo: ${task.title}`,
        body,
        type: 'warning',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }

    // Overdue (Black Tier)
    const overdueKey = `overdue-${task.id}`;
    if (now >= end && !notifiedEventsCache.has(overdueKey)) {
      notifiedEventsCache.add(overdueKey);
      soundService.playChime('overdue');
      const body = buildTaskBody(task, `Fecha límite superada.`);
      sendPushNotification(`🚨 Tarea Vencida: ${task.title}`, { body });
      onInAppNotification({
        id: `notif-${Date.now()}-${Math.random()}`,
        title: `🚨 Tarea Vencida: ${task.title}`,
        body,
        type: 'overdue',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }
  });
}

/**
 * Schedules Native Android Local Notifications in advance using Capacitor LocalNotifications plugin
 */
export async function scheduleTaskOSNotifications(tasks: TaskItem[]) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await setupAndroidNotificationChannel();

    // Cancel previous pending notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    const notificationsToSchedule: any[] = [];
    const now = Date.now();
    let idCounter = 1000;

    tasks.forEach((task) => {
      if (task.status === 'done') return;

      const startTime = new Date(task.startDate).getTime();
      const endTime = new Date(task.endDate).getTime();
      const body = buildTaskBody(task);

      // 1. Task Start Exact Time Notification
      if (startTime > now) {
        notificationsToSchedule.push({
          id: idCounter++,
          title: `▶️ ¡Hora de Iniciar!: ${task.title}`,
          body,
          channelId: 'kronotask_alerts',
          schedule: { at: new Date(startTime) },
        });
      }

      // 2. Task Start Reminders (e.g. 5m, 15m, 30m before start)
      if (task.reminders) {
        task.reminders.forEach((rem) => {
          const remTime = startTime - rem.offsetMinutes * 60 * 1000;
          if (remTime > now) {
            notificationsToSchedule.push({
              id: idCounter++,
              title: `🚀 Recordatorio (Faltan ${rem.offsetMinutes}m): ${task.title}`,
              body,
              channelId: 'kronotask_alerts',
              schedule: { at: new Date(remTime) },
            });
          }
        });
      }

      // 3. Task Deadline / End Time
      if (endTime > now) {
        notificationsToSchedule.push({
          id: idCounter++,
          title: `⚠️ Fecha Límite: ${task.title}`,
          body,
          channelId: 'kronotask_alerts',
          schedule: { at: new Date(endTime) },
        });
      }

      // 4. Task Deadline Reminders
      if (task.reminders) {
        task.reminders.forEach((rem) => {
          const remEnd = endTime - rem.offsetMinutes * 60 * 1000;
          if (remEnd > now) {
            notificationsToSchedule.push({
              id: idCounter++,
              title: `⏰ Recordatorio Entrega (${rem.offsetMinutes}m): ${task.title}`,
              body,
              channelId: 'kronotask_alerts',
              schedule: { at: new Date(remEnd) },
            });
          }
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule.slice(0, 50),
      });
    }
  } catch (e) {
    console.warn('Error scheduling native local notifications:', e);
  }
}

