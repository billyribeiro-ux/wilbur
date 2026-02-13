// ---------------------------------------------------------------------------
// roomFiles.ts — Microsoft Enterprise Lean Edition (Verified + Stable)
// API-backed file management
// ---------------------------------------------------------------------------

import { storageApi } from "../../api/storage";
import { logger } from "../../utils/productionLogger";

// ────────────────────────────────────────────────────────────────────────────
// Types & Error Class
// ────────────────────────────────────────────────────────────────────────────
export interface RoomFile {
  id: string;
  room_id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export class RoomFileError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = "RoomFileError";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Utility: Exponential backoff retry
// ────────────────────────────────────────────────────────────────────────────
async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 250
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch all files for a room
// ────────────────────────────────────────────────────────────────────────────
export async function getRoomFiles(roomId: string): Promise<RoomFile[]> {
  try {
    logger.info("[roomFiles] Fetching room files", { roomId });

    const data = await storageApi.listRoomFiles(roomId);

    return (data || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      room_id: item.room_id as string,
      user_id: (item.uploaded_by as string) || '',
      filename: (item.file_name as string) || '',
      file_url: (item.file_url as string) || '',
      file_size: (item.file_size as number) || 0,
      mime_type: (item.mime_type as string) || 'application/octet-stream',
      created_at: (item.created_at as string) || '',
    }));
  } catch (error) {
    logger.error("[roomFiles] getRoomFiles failed", error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Upload files with validation + retry
// ────────────────────────────────────────────────────────────────────────────
export async function uploadRoomFiles(
  roomId: string,
  userId: string,
  files: File[]
): Promise<RoomFile[]> {
  if (!roomId || !userId)
    throw new RoomFileError("Missing room_id or user_id");
  if (!files.length) throw new RoomFileError("No files provided");

  const MAX = 50 * 1024 * 1024; // 50 MB
  const uploaded: RoomFile[] = [];

  for (const file of files) {
    if (file.size > MAX)
      throw new RoomFileError(`File too large: ${file.name}`);

    // Upload with retry
    const result = await retry(async () => {
      logger.info("[roomFiles] Uploading file", { roomId, userId, file: file.name });
      return storageApi.uploadRoomFile(roomId, file);
    });

    uploaded.push({
      id: result.id,
      room_id: result.room_id,
      user_id: result.uploaded_by,
      filename: result.file_name,
      file_url: result.file_url,
      file_size: result.file_size || file.size,
      mime_type: result.mime_type || file.type || "application/octet-stream",
      created_at: result.created_at,
    });
  }

  logger.info("[roomFiles] Upload completed", { count: uploaded.length });
  return uploaded;
}

// ────────────────────────────────────────────────────────────────────────────
// Delete file safely
// ────────────────────────────────────────────────────────────────────────────
export async function deleteRoomFile(fileId: string, _userId: string) {
  try {
    logger.info("[roomFiles] Deleting file", { fileId });

    await retry(async () => {
      await storageApi.delete(fileId);
    });

    logger.info("[roomFiles] File deleted successfully", { fileId });
  } catch (error) {
    logger.error("[roomFiles] deleteRoomFile failed", error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Download file (returns URL)
// ────────────────────────────────────────────────────────────────────────────
export async function downloadRoomFile(fileId: string): Promise<string> {
  try {
    // Get file info from room files list - we need to find the file URL
    // Since storageApi doesn't have a direct get-by-id, we use the fileId
    // The caller should already have the file_url from the list
    throw new RoomFileError("Use file_url from getRoomFiles() directly", { fileId });
  } catch (error) {
    logger.error("[roomFiles] downloadRoomFile failed", error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function getFileTypeCategory(mime: string): "file" | "image" | "sound" {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "sound";
  return "file";
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Get files filtered by type
// ────────────────────────────────────────────────────────────────────────────
export async function getRoomFilesByType(
  roomId: string,
  type: "file" | "image" | "sound"
): Promise<RoomFile[]> {
  const all = await getRoomFiles(roomId);
  return all.filter((f) => getFileTypeCategory(f.mime_type) === type);
}
