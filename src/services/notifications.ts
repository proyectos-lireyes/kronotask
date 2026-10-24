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
            sendPushNotification(`🚀 Inicia Pronto: ${task.title}`, {
              body: `Faltan ${rem.offsetMinutes} minutos para iniciar la tarea programada.`,
            });
            onInAppNotification({
              id: `notif-start-${Date.now()}-${Math.random()}`,
              title: `🚀 Inicia Pronto: ${task.title}`,
              body: `Tu tarea está programada para comenzar en ${rem.offsetMinutes} minutos.`,
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
      sendPushNotification(`▶️ ¡Hora de Iniciar!: ${task.title}`, {
        body: `Llegó la hora de inicio programada. ¡Comienza a trabajar en ella!`,
      });
      onInAppNotification({
        id: `notif-startexact-${Date.now()}-${Math.random()}`,
        title: `▶️ ¡Hora de Iniciar Tarea!`,
        body: `"${task.title}" debe comenzar ahora mismo.`,
        type: 'info',
        timestamp: new Date().toISOString(),
        taskId: task.id,
      });
    }

    // Task Start Passed but Still in "Por Hacer" (Pending Start Alert)
    const unstartedPendingKey = `unstarted-${task.id}-${todayDateStr}`;
    if (now > start && task.status === 'todo' && !notifiedEventsCache.has(unstartedPendingKey)) {
      notifiedEventsCache.add(unstartedPendingKey);
      soundService.playChime('reminder');
      sendPushNotification(`⚠️ Inicio Pendiente: ${task.title}`, {
        body: `Su hora de inicio fue ${new Date(task.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} y sigue en 'Por Hacer'.`,
      });
      onInAppNotification({
        id: `notif-unstarted-${Date.now()}-${Math.random()}`,
        title: `⚠️ Tarea por Iniciar`,
        body: `"${task.title}" debió iniciar a las ${new Date(task.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} y sigue pendiente en Por Hacer.`,
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
            sendPushNotification(`⏰ Recordatorio Vencimiento: ${task.title}`, {
              body: `Faltan ${rem.offsetMinutes} minutos para la fecha límite de entrega.`,
            });
            onInAppNotification({
              id: `notif-end-${Date.now()}-${Math.random()}`,
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

    // Imminent warning (< 15 min to deadline)
    const imminentKey = `imminent-${task.id}`;
    if (endDiffMinutes <= 15 && endDiffMinutes > 0 && !notifiedEventsCache.has(imminentKey)) {
      notifiedEventsCache.add(imminentKey);
      soundService.playChime('reminder');
      sendPushNotification(`⚠️ Vencimiento Próximo: ${task.title}`, {
        body: `Quedan menos de 15 minutos para la entrega.`,
      });
      onInAppNotification({
        id: `notif-${Date.now()}-${Math.random()}`,
        title: `Vencimiento Próximo: ${task.title}`,
        body: `Quedan ${endDiffMinutes} minutos para vencer el plazo.`,
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

      // 1. Task Start Exact Time Notification
      if (startTime > now) {
        notificationsToSchedule.push({
          id: idCounter++,
          title: `▶️ ¡Hora de Iniciar!: ${task.title}`,
          body: `Llegó la hora de inicio de tu tarea "${task.title}".`,
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
              title: `🚀 Recordatorio de Inicio: ${task.title}`,
              body: `Faltan ${rem.offsetMinutes} minutos para iniciar "${task.title}".`,
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
          title: `⚠️ Fecha Límite de Entrega: ${task.title}`,
          body: `La tarea "${task.title}" debe entregarse ahora.`,
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
              title: `⏰ Recordatorio de Entrega: ${task.title}`,
              body: `Faltan ${rem.offsetMinutes} minutos para vencer "${task.title}".`,
              channelId: 'kronotask_alerts',
              schedule: { at: new Date(remEnd) },
            });
          }
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      // Schedule max 50 pending notifications to keep within Android OS limits
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule.slice(0, 50),
      });
    }
  } catch (e) {
    console.warn('Error scheduling native local notifications:', e);
  }
}

