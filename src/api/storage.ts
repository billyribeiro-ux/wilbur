/**
 * Storage API — Replaces supabase.storage.* calls.
 */

import { api } from './client';

interface RoomFile {
  id: string;
  room_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface Note {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const storageApi = {
  upload(file: File, bucketPrefix = 'uploads'): Promise<{ key: string; url: string }> {
    return api.upload('/api/v1/storage/upload', file, { bucket_prefix: bucketPrefix });
  },

  delete(fileId: string): Promise<void> {
    return api.delete(`/api/v1/storage/files/${fileId}`);
  },

  listRoomFiles(roomId: string): Promise<RoomFile[]> {
    return api.get<RoomFile[]>(`/api/v1/storage/rooms/${roomId}/files`);
  },

  uploadRoomFile(roomId: string, file: File): Promise<RoomFile> {
    return api.upload(`/api/v1/storage/rooms/${roomId}/files`, file);
  },

  listNotes(roomId: string): Promise<Note[]> {
    return api.get<Note[]>(`/api/v1/storage/rooms/${roomId}/notes`);
  },

  createNote(roomId: string, title: string, content: string): Promise<Note> {
    return api.post<Note>(`/api/v1/storage/rooms/${roomId}/notes`, { title, content });
  },
};
