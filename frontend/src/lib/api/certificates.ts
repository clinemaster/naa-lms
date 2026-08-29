import { apiClient } from "./client";
import type { Certificate } from "../types";

export const certificateApi = {
  myCertificates: (userId: number) => apiClient.get<Certificate[]>(`/student/certificates/${userId}/`),

  verify: (certificateId: string) =>
    apiClient.get<Certificate>(`/certificates/verify/${certificateId}/`, { auth: false }),
};
