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
        sendPushNotification(`⚡ Reactivación Automática: ${task.title}`, {
          body: `Estuvo en espera durante 4 días. Se ha cambiado automáticamente a 'En Progreso'.`,
        });
        onInAppNotification({
          id: `reactivate-${task.id}-${now}`,
          title: 'Reactivación Automática',
          body: `"${task.title}" cumplió los 4 días en espera y regresó a En Progreso.`,
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
      sendPushNotification(`📅 Agenda de Hoy: ${tasksToday.length} tarea(s)`, {
        body: `Tienes ${tasksToday.length} entrega(s) programadas para hoy. Toca para verlas.`,
      });
      onInAppNotification({
        id: `daily-note-${todayDateStr}`,
        title: `📅 Agenda de Hoy (${tasksToday.length} tareas)`,
        body: `Tienes ${tasksToday.length} tarea(s) con fecha límite hoy.`,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Monday Weekly Briefing Check (Tasks for this week through Sunday)
  const isMonday = new Date().getDay() === 1; // 1 = Monday
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
      sendPushNotification(`🗓️ Resumen Semanal: ${tasksThisWeek.length} tarea(s) esta semana`, {
        body: `Planificación de Lunes a Domingo: ${tasksThisWeek.length} tareas pendientes en tu tablero.`,
      });
      onInAppNotification({
        id: `weekly-note-${todayDateStr}`,
        title: `🗓️ Resumen Semanal (${tasksThisWeek.length} tareas)`,
        body: `Planificación semanal activa hasta el domingo con ${tasksThisWeek.length} entregas.`,
        type: 'info',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 4. Task Deadlines and Custom Reminders
  tasks.forEach((task) => {
    if (task.status === 'done') return;

    const end = new Date(task.endDate).getTime();
    const diffMinutes = Math.floor((end - now) / (60 * 1000));

    // Custom offset reminders
    if (task.reminders && task.reminders.length > 0) {
      task.reminders.forEach((rem) => {
        const reminderKey = `rem-${task.id}-${rem.offsetMinutes}`;
        if (!notifiedEventsCache.has(reminderKey)) {
          if (diffMinutes <= rem.offsetMinutes && diffMinutes >= rem.offsetMinutes - 2) {
            notifiedEventsCache.add(reminderKey);
            soundService.playChime('reminder');
            sendPushNotification(`⏰ Recordatorio: ${task.title}`, {
              body: `Faltan ${rem.offsetMinutes} minutos para la fecha límite. Prioridad: ${task.priority}`,
            });
            onInAppNotification({
              id: `notif-${Date.now()}-${Math.random()}`,
              title: `Recordatorio: ${task.title}`,
              body: `Faltan ${rem.offsetMinutes} minutos para la entrega.`,
              type: 'reminder',
              timestamp: new Date().toISOString(),
              taskId: task.id,
            });
          }
        }
      });
    }

    // Imminent warning (< 15 min)
    const imminentKey = `imminent-${task.id}`;
    if (diffMinutes <= 15 && diffMinutes > 0 && !notifiedEventsCache.has(imminentKey)) {
      notifiedEventsCache.add(imminentKey);
      soundService.playChime('reminder');
      sendPushNotification(`⚠️ Vencimiento Próximo: ${task.title}`, {
        body: `Quedan menos de 15 minutos para la entrega.`,
      });
      onInAppNotification({
        id: `notif-${Date.now()}-${Math.random()}`,
        title: `Vencimiento Próximo: ${task.title}`,
        body: `Quedan ${diffMinutes} minutos para vencer el plazo.`,
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
      sendPushNotification(`🚨 Tarea Vencida: ${task.title}`, {
        body: `La fecha límite ha sido superada. Nivel Negro activado.`,
      });
      onInAppNotification({
        id: `notif-${Date.now()}-${Math.random()}`,
        title: `¡Tarea Vencida!`,
        body: `"${task.title}" ha superado su plazo límite.`,
        type: 'overdue',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }
  });
}
