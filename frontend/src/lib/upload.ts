import { teacherApi } from "./api/teacher";
import { ApiRequestError } from "./api/client";

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  status: "uploading" | "processing" | "done" | "error";
  message?: string;
}

const MAX_RETRIES_PER_CHUNK = 3;

/**
 * Uploads a lesson video in chunks so a dropped connection only costs the
 * current chunk, not the whole file. Retries a failing chunk a few times
 * before giving up; the caller can re-invoke this to resume, since the
 * server reports back exactly how many bytes it already has.
 */
export async function uploadVideoResumable(
  variantItemId: string,
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  onProgress({ uploadedBytes: 0, totalBytes: file.size, percent: 0, status: "uploading" });

  const init = await teacherApi.initVideoUpload({
    variant_item_id: variantItemId,
    filename: file.name,
    file_size: file.size,
    content_type: file.type,
  });

  const chunkSize = init.chunk_size;
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    let attempt = 0;

    while (true) {
      try {
        const result = await teacherApi.uploadChunk(init.upload_id, offset, chunk);
        offset = result.received_bytes;
        onProgress({
          uploadedBytes: offset,
          totalBytes: file.size,
          percent: result.percent_complete,
          status: "uploading",
        });
        break;
      } catch (error) {
        attempt += 1;
        // The server may have a different offset than we expect (e.g. after
        // a resume) -- resync to it instead of retrying blindly.
        if (error instanceof ApiRequestError && error.status === 409) {
          const status = await teacherApi.getUploadStatus(init.upload_id);
          offset = status.received_bytes;
          break;
        }
        if (attempt >= MAX_RETRIES_PER_CHUNK) {
          onProgress({
            uploadedBytes: offset,
            totalBytes: file.size,
            percent: Math.round((offset / file.size) * 100),
            status: "error",
            message: "Upload interrupted. Please try again.",
          });
          throw error;
        }
      }
    }
  }

  onProgress({ uploadedBytes: file.size, totalBytes: file.size, percent: 100, status: "processing" });
  await teacherApi.completeUpload(init.upload_id);
  onProgress({ uploadedBytes: file.size, totalBytes: file.size, percent: 100, status: "done" });
}
