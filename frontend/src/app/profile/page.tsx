"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { profileApi } from "@/lib/api/profile";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { mediaUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { FormField, Page, PageHeader, PasswordInput, RequireRole, SectionSkeleton } from "@/components/shared";

function ProfileContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => profileApi.get(user!.id),
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [about, setAbout] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setCountry(profile.country || "");
      setAbout(profile.about || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("bio", bio);
      formData.append("country", country);
      formData.append("about", about);
      if (imageFile) formData.append("image", imageFile);
      return profileApi.update(user!.id, formData);
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setImageFile(null);
    },
    onError: (error: unknown) => toast.error(error instanceof ApiRequestError ? error.message : "Could not update profile."),
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ old_password: oldPassword, new_password: newPassword }),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
    },
    onError: (error: unknown) => toast.error(error instanceof ApiRequestError ? error.message : "Could not change password."),
  });

  const initials = user?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Page width="sm">
        <PageHeader title="Profile" />

        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={imageFile ? URL.createObjectURL(imageFile) : mediaUrl(profile?.image)} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <FormField label="Email">
                <Input value={user?.email || ""} disabled />
              </FormField>
              <FormField label="Full name" htmlFor="full_name">
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </FormField>
              <FormField label="Country" htmlFor="country">
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </FormField>
              <FormField label="Short bio" htmlFor="bio">
                <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              </FormField>
              <FormField label="About" htmlFor="about">
                <Textarea id="about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
              </FormField>
              <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Current password" htmlFor="old_password">
              <PasswordInput
                id="old_password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </FormField>
            <FormField label="New password" htmlFor="new_password">
              <PasswordInput
                id="new_password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FormField>
            <Button
              disabled={!oldPassword || !newPassword || passwordMutation.isPending}
              onClick={() => passwordMutation.mutate()}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>
      </Page>
    </>
  );
}

export default function ProfilePage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin", "Academy Admin"]}>
      <ProfileContent />
    </RequireRole>
  );
}
