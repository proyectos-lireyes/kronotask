import { ComplianceMetrics, TaskItem } from '../types';
import { calculateTimeLevel } from '../utils/timeColor';
import { formatRecurrenceLabel } from '../utils/recurrence';

export function calculateComplianceMetrics(tasks: TaskItem[]): ComplianceMetrics {
  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      completedOnTime: 0,
      completedLate: 0,
      pendingOnTime: 0,
      overdueTasks: 0,
      complianceRate: 100,
      averageCompletionHours: 0,
    };
  }

  let completedTasks = 0;
  let completedOnTime = 0;
  let completedLate = 0;
  let pendingOnTime = 0;
  let overdueTasks = 0;
  let totalCompletionHours = 0;

  const now = Date.now();

  tasks.forEach((task) => {
    const end = new Date(task.endDate).getTime();
    const start = new Date(task.startDate).getTime();

    if (task.status === 'done') {
      completedTasks++;
      const completedTime = task.completedAt ? new Date(task.completedAt).getTime() : now;
      if (completedTime <= end) {
        completedOnTime++;
      } else {
        completedLate++;
      }
      const durationHours = (completedTime - start) / (1000 * 60 * 60);
      if (durationHours > 0) totalCompletionHours += durationHours;
    } else {
      if (now > end) {
        overdueTasks++;
      } else {
        pendingOnTime++;
      }
    }
  });

  const evaluatedTasks = completedTasks + overdueTasks;
  const complianceRate = evaluatedTasks > 0
    ? Math.round((completedOnTime / evaluatedTasks) * 100)
    : 100;

  const averageCompletionHours = completedTasks > 0
    ? Math.round((totalCompletionHours / completedTasks) * 10) / 10
    : 0;

  return {
    totalTasks,
    completedTasks,
    completedOnTime,
    completedLate,
    pendingOnTime,
    overdueTasks,
    complianceRate,
    averageCompletionHours,
  };
}

export function exportTasksToExcel(tasks: TaskItem[]) {
  const metrics = calculateComplianceMetrics(tasks);

  const headers = [
    'ID',
    'Tablero',
    'Título',
    'Estado',
    'Nivel Semáforo',
    '% Tiempo Consumido',
    'Tiempo Restante / Estado',
    'Prioridad',
    'Tipo',
    'Fecha Inicio',
    'Fecha Fin (Límite)',
    'Fecha de Completado',
    'Cumplimiento',
    'Periodicidad',
    'Etiquetas',
    'Cantidad Adjuntos',
    'Cantidad Comentarios',
  ];

  const rows = tasks.map((t) => {
    const timeCalc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), t.status === 'done');
    let complianceStatus = 'En tiempo';
    if (t.status === 'done') {
      const end = new Date(t.endDate).getTime();
      const comp = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
      complianceStatus = comp <= end ? 'Completado a tiempo' : 'Completado con retraso';
    } else if (timeCalc.isOverdue) {
      complianceStatus = 'Vencido / Fuera de plazo';
    }

    return [
      `"${t.id}"`,
      `"${t.boardId || 'General'}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${timeCalc.label}"`,
      `"${timeCalc.percentElapsed.toFixed(1)}%"`,
      `"${timeCalc.remainingText}"`,
      `"${t.priority}"`,
      `"${t.type}"`,
      `"${new Date(t.startDate).toLocaleString()}"`,
      `"${new Date(t.endDate).toLocaleString()}"`,
      `"${t.completedAt ? new Date(t.completedAt).toLocaleString() : 'Pendiente'}"`,
      `"${complianceStatus}"`,
      `"${formatRecurrenceLabel(t.recurrence)}"`,
      `"${t.tags.join(', ')}"`,
      `"${t.attachments.length}"`,
      `"${t.comments.length}"`,
    ].join(',');
  });

  const summaryLines = [
    '',
    '--- RESUMEN EJECUTIVO DE CUMPLIMIENTO ---',
    `"Total Tareas Analizadas",${metrics.totalTasks}`,
    `"Tasa de Cumplimiento",${metrics.complianceRate}%`,
    `"Tareas Completadas a Tiempo",${metrics.completedOnTime}`,
    `"Tareas Completadas con Retraso",${metrics.completedLate}`,
    `"Tareas Pendientes en Plazo",${metrics.pendingOnTime}`,
    `"Tareas Vencidas (Nivel Negro)",${metrics.overdueTasks}`,
    `"Tiempo Promedio de Completado",${metrics.averageCompletionHours} horas`,
    `"Fecha de Generación","${new Date().toLocaleString()}"`,
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...rows, ...summaryLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ChronoTask_Reporte_Cumplimiento_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printCompliancePDF(tasks: TaskItem[]) {
  const metrics = calculateComplianceMetrics(tasks);
  const nowStr = new Date().toLocaleString();

  const taskRowsHtml = tasks.map((t) => {
    const timeCalc = calculateTimeLevel(t.startDate, t.endDate, Date.now(), t.status === 'done');
    const colorMap: Record<string, string> = {
      green: '#10b981',
      blue: '#0ea5e9',
      yellow: '#eab308',
      orange: '#f97316',
      red: '#ef4444',
      black: '#1c1917',
    };
    const colorHex = colorMap[timeCalc.level] || '#64748b';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 8px 10px; font-weight: 600;">${t.title}</td>
        <td style="padding: 8px 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${colorHex}; margin-right: 6px;"></span>
          ${timeCalc.label}
        </td>
        <td style="padding: 8px 10px; text-transform: capitalize;">${t.priority}</td>
        <td style="padding: 8px 10px; text-transform: capitalize;">${t.status.replace('_', ' ')}</td>
        <td style="padding: 8px 10px;">${new Date(t.startDate).toLocaleDateString()}</td>
        <td style="padding: 8px 10px; font-weight: 600;">${new Date(t.endDate).toLocaleDateString()} ${new Date(t.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding: 8px 10px; font-weight: 500; color: ${timeCalc.isOverdue && t.status !== 'done' ? '#b91c1c' : '#334155'};">
          ${timeCalc.remainingText}
        </td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para generar el PDF');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Reporte de Cumplimiento - ChronoTask</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 40px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .logo-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }
        .logo-title span {
          color: #2563eb;
        }
        .meta-info {
          font-size: 12px;
          color: #64748b;
          text-align: right;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .kpi-val {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
        }
        .kpi-lbl {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
          border-bottom: 2px solid #cbd5e1;
        }
        @media print {
          body { margin: 15mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">Chrono<span>Task</span> • Informe Ejecutivo de Cumplimiento</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Auditoría de plazos, semáforo de tiempo y rendimiento de proyectos</div>
        </div>
        <div class="meta-info">
          <div><strong>Fecha Emisión:</strong> ${nowStr}</div>
          <div><strong>Total Tareas:</strong> ${metrics.totalTasks}</div>
          <div class="no-print" style="margin-top: 8px;">
            <button onclick="window.print()" style="padding: 6px 14px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Imprimir / Guardar como PDF
            </button>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="border-top: 4px solid #10b981;">
          <div class="kpi-val" style="color: ${metrics.complianceRate >= 80 ? '#10b981' : '#f59e0b'};">
            ${metrics.complianceRate}%
          </div>
          <div class="kpi-lbl">Tasa de Cumplimiento</div>
        </div>
        <div class="kpi-card" style="border-top: 4px solid #0ea5e9;">
          <div class="kpi-val">${metrics.completedTasks}</div>
          <div class="kpi-lbl">Tareas Completadas</div>
        </div>
        <div class="kpi-card" style="border-top: 4px solid #f97316;">
          <div class="kpi-val">${metrics.pendingOnTime}</div>
          <div class="kpi-lbl">Activas en Plazo</div>
        </div>
        <div class="kpi-card" style="border-top: 4px solid #1c1917;">
          <div class="kpi-val" style="color: ${metrics.overdueTasks > 0 ? '#b91c1c' : '#0f172a'};">${metrics.overdueTasks}</div>
          <div class="kpi-lbl">Vencidas (Nivel Negro)</div>
        </div>
      </div>

      <h3 style="font-size: 15px; margin-bottom: 8px; color: #1e293b;">Detalle Individual de Tareas</h3>
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Semáforo</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Inicio</th>
            <th>Límite</th>
            <th>Tiempo Restante</th>
          </tr>
        </thead>
        <tbody>
          ${taskRowsHtml}
        </tbody>
      </table>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 400);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
