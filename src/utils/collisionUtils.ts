import { TaskItem, Board } from '../types';

export const isEventType = (item: { type?: string }): boolean => {
  const t = (item.type || '').toLowerCase().trim();
  return t === 'evento' || t === 'event';
};

export interface TaskCollision {
  id: string; // pair key: `${sortedId1}___${sortedId2}`
  taskA: TaskItem;
  taskB: TaskItem;
  boardA?: Board;
  boardB?: Board;
  isInterBoard: boolean;
  overlapStart: Date;
  overlapEnd: Date;
  overlapMinutes: number;
  collisionType: 'event_event' | 'event_task';
  isAccepted: boolean;
}

export const getCollisionPairKey = (idA: string, idB: string): string => {
  return [idA, idB].sort().join('___');
};

/**
 * Calculates collisions across active tasks according to business rules:
 * - Only events cannot collide by default.
 * - Non-events (tareas, funciones, mantenimiento, investigación, hito) CAN run in parallel.
 * - Collisions occur IF AND ONLY IF at least one of the overlapping items is an 'evento':
 *    - Event vs Event: Collision
 *    - Event vs Task (or other non-event): Collision
 *    - Task vs Task (non-events): Parallel allowed, NO collision!
 */
export function detectCollisions(
  tasks: TaskItem[],
  boards: Board[],
  acceptedCollisionKeys: string[] = []
): TaskCollision[] {
  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const collisions: TaskCollision[] = [];
  const acceptedSet = new Set(acceptedCollisionKeys);

  for (let i = 0; i < activeTasks.length; i++) {
    for (let j = i + 1; j < activeTasks.length; j++) {
      const taskA = activeTasks[i];
      const taskB = activeTasks[j];

      const aIsEvent = isEventType(taskA);
      const bIsEvent = isEventType(taskB);

      // Non-events can run in parallel, no collision triggered!
      if (!aIsEvent && !bIsEvent) {
        continue;
      }

      const startA = new Date(taskA.startDate).getTime();
      const endA = new Date(taskA.endDate).getTime();
      const startB = new Date(taskB.startDate).getTime();
      const endB = new Date(taskB.endDate).getTime();

      if (isNaN(startA) || isNaN(endA) || isNaN(startB) || isNaN(endB)) {
        continue;
      }

      const overlapStartMs = Math.max(startA, startB);
      const overlapEndMs = Math.min(endA, endB);

      if (overlapEndMs > overlapStartMs) {
        const overlapMinutes = Math.round((overlapEndMs - overlapStartMs) / (1000 * 60));
        // Overlap of at least 5 minutes
        if (overlapMinutes >= 5) {
          const pairKey = getCollisionPairKey(taskA.id, taskB.id);
          const boardA = boards.find((b) => b.id === taskA.boardId);
          const boardB = boards.find((b) => b.id === taskB.boardId);

          collisions.push({
            id: pairKey,
            taskA,
            taskB,
            boardA,
            boardB,
            isInterBoard: taskA.boardId !== taskB.boardId,
            overlapStart: new Date(overlapStartMs),
            overlapEnd: new Date(overlapEndMs),
            overlapMinutes,
            collisionType: aIsEvent && bIsEvent ? 'event_event' : 'event_task',
            isAccepted: acceptedSet.has(pairKey),
          });
        }
      }
    }
  }

  return collisions;
}

/**
 * Checks if a proposed time window and type collides with existing tasks
 */
export function checkTaskCollisionWithExisting(
  currentTaskId: string | undefined,
  currentType: string,
  startIso: string,
  endIso: string,
  allTasks: TaskItem[],
  boards: Board[],
  acceptedKeys: string[] = []
): {
  collides: boolean;
  collidingTasks: { task: TaskItem; board?: Board; pairKey: string; isAccepted: boolean; isEvent: boolean }[];
} {
  const isCurrentAnEvent = isEventType({ type: currentType });
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { collides: false, collidingTasks: [] };
  }

  const colliding: { task: TaskItem; board?: Board; pairKey: string; isAccepted: boolean; isEvent: boolean }[] = [];
  const acceptedSet = new Set(acceptedKeys);

  for (const other of allTasks) {
    if (other.id === currentTaskId) continue;
    if (other.status === 'done') continue;

    const otherIsEvent = isEventType(other);

    // If neither the new/edited item nor the existing item is an event, parallel is permitted!
    if (!isCurrentAnEvent && !otherIsEvent) {
      continue;
    }

    const oStart = new Date(other.startDate).getTime();
    const oEnd = new Date(other.endDate).getTime();

    if (isNaN(oStart) || isNaN(oEnd)) continue;

    const overlapStart = Math.max(startMs, oStart);
    const overlapEnd = Math.min(endMs, oEnd);

    if (overlapEnd > overlapStart && overlapEnd - overlapStart >= 5 * 60 * 1000) {
      const pairKey = currentTaskId ? getCollisionPairKey(currentTaskId, other.id) : `new___${other.id}`;
      const board = boards.find((b) => b.id === other.boardId);
      colliding.push({
        task: other,
        board,
        pairKey,
        isAccepted: acceptedSet.has(pairKey),
        isEvent: otherIsEvent,
      });
    }
  }

  return {
    collides: colliding.length > 0,
    collidingTasks: colliding,
  };
}
