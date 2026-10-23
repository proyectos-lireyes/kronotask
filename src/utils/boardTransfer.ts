import { Board, TaskItem, CustomTag, CustomTypeDefinition, CustomPriorityDefinition } from '../types';

export interface BoardExportPackage {
  format: 'kronotask-board-v1';
  exportedAt: string;
  board: Board;
  tasks: TaskItem[];
  tags?: CustomTag[];
  types?: CustomTypeDefinition[];
  priorities?: CustomPriorityDefinition[];
}

/**
 * Encodes a board and its associated tasks into a robust UTF-8 Base64 string.
 */
export function exportBoardToBase64(
  board: Board,
  allTasks: TaskItem[],
  allTags?: CustomTag[],
  allTypes?: CustomTypeDefinition[],
  allPriorities?: CustomPriorityDefinition[]
): string {
  const boardTasks = allTasks.filter((t) => t.boardId === board.id || (!t.boardId && board.id === 'board-work'));

  const pkg: BoardExportPackage = {
    format: 'kronotask-board-v1',
    exportedAt: new Date().toISOString(),
    board: {
      ...board,
    },
    tasks: boardTasks,
    tags: allTags,
    types: allTypes,
    priorities: allPriorities,
  };

  const jsonStr = JSON.stringify(pkg);
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Parses and validates an incoming Base64 string into a BoardExportPackage.
 */
export function parseBoardFromBase64(base64Str: string): BoardExportPackage {
  const clean = base64Str.trim().replace(/\s+/g, '');
  if (!clean) {
    throw new Error('El texto proporcionado está vacío.');
  }

  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr) as BoardExportPackage;

    if (!parsed || !parsed.board || !parsed.board.name || !Array.isArray(parsed.tasks)) {
      throw new Error('El contenido decodificado no contiene una estructura de tablero válida.');
    }

    return parsed;
  } catch (e: any) {
    throw new Error(`No se pudo decodificar el código Base64: ${e.message}`);
  }
}
