import { apiClient } from "./client";
import type { LessonAccessResponse, ProgressHeartbeatResponse } from "../types";

export const progressApi = {
  getLessonAccess: (variantItemId: string) =>
    apiClient.get<LessonAccessResponse>(`/lesson/${variantItemId}/progress/`),

  sendHeartbeat: (variantItemId: string, position: number, duration: number) =>
    apiClient.post<ProgressHeartbeatResponse>(`/lesson/${variantItemId}/progress/`, { position, duration }),

  getVideoUrl: (variantItemId: string) =>
    apiClient.get<{ url: string; expires_in: number }>(`/lesson/${variantItemId}/video-access/`),
};
