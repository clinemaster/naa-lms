import { apiClient } from "./client";

export interface UserProfile {
  id: number;
  user: number;
  image: string | null;
  full_name: string;
  bio: string | null;
  country: string | null;
  date: string;
  about: string | null;
}

export const profileApi = {
  get: (userId: number) => apiClient.get<UserProfile>(`/user/profile/${userId}/`),
  update: (userId: number, formData: FormData) =>
    apiClient.patch<UserProfile>(`/user/profile/${userId}/`, formData, { isForm: true }),
};
