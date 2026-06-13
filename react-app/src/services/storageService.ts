/** Shared utility -- SSOT. Do not duplicate logic elsewhere. */
/** Storage service using storageApi */

import { storageApi } from '../api/storage';

export interface UploadAssetParams {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
}

export type UploadAssetResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Uploads a file via the API and returns the public URL.
 * No direct UI or store access - pure service function.
 * Returns typed result instead of throwing.
 *
 * @param params - Upload parameters
 * @returns Promise resolving to typed result
 */
export async function uploadPublicAsset(
  params: UploadAssetParams
): Promise<UploadAssetResult> {
  const { bucket, file } = params;

  try {
    const result = await storageApi.upload(file, bucket);

    if (!result?.url) {
      return {
        ok: false,
        error: 'Failed to retrieve public URL after upload',
      };
    }

    return { ok: true, url: result.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}
