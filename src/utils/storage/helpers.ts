import {
  getPresignedImageUploadUrlFn,
  getPresignedUploadUrlFn,
  uploadImageDirectFn,
} from "~/fn/storage";
import { getVideoDuration, formatDuration } from "../video-duration";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  videoKey: string;
  duration: string; // formatted duration like "2:34"
  durationSeconds: number; // raw duration in seconds
}

export interface ImageUploadResult {
  imageKey: string;
}

const MAX_DIRECT_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

function uploadWithXhr(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  errorPrefix: string = "Upload failed"
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`${errorPrefix}: ${xhr.statusText || xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error(`${errorPrefix}: Network error`));
    };

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

export async function uploadVideoWithPresignedUrl(
  key: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Calculate video duration first
  const durationSeconds = await getVideoDuration(file);
  const duration = formatDuration(durationSeconds);

  // Get presigned URL from server
  const { presignedUrl } = await getPresignedUploadUrlFn({
    data: { videoKey: key },
  });

  await uploadWithXhr(presignedUrl, file, onProgress, "Upload failed");

  return {
    videoKey: key,
    duration,
    durationSeconds,
  };
}

export async function uploadImageWithPresignedUrl(
  key: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ImageUploadResult> {
  // Get presigned URL from server
  const { presignedUrl } = await getPresignedImageUploadUrlFn({
    data: { imageKey: key },
  });

  try {
    await uploadWithXhr(presignedUrl, file, onProgress, "Image upload failed");

    return {
      imageKey: key,
    };
  } catch (directUploadError) {
    if (file.size > MAX_DIRECT_IMAGE_UPLOAD_BYTES) {
      throw directUploadError;
    }

    if (!file.type.startsWith("image/")) {
      throw directUploadError;
    }

    const formData = new FormData();
    formData.set("imageKey", key);
    formData.set("contentType", file.type);
    formData.set("fileSize", String(file.size));
    formData.set("file", file);

    await uploadImageDirectFn({
      data: formData,
    });

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percentage: 100,
    });

    return {
      imageKey: key,
    };
  }
}
