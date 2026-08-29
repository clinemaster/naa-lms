"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload, CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ImageCropDialog } from "@/components/shared/ImageCropDialog";
import { courseApi } from "@/lib/api/courses";
import { teacherApi } from "@/lib/api/teacher";
import { ApiRequestError } from "@/lib/api/client";
import { uploadVideoResumable, type UploadProgress } from "@/lib/upload";
import { mediaUrl, categoryIdOf } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { Course, LessonMaterial } from "@/lib/types";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LANGUAGES = ["English", "Spanish", "French", "Swahili"];

interface BuilderLesson {
  key: string;
  id?: number;
  variant_item_id?: string;
  title: string;
  description: string;
  videoFile: File | null;
  hasExistingVideo: boolean;
  upload: UploadProgress | null;
  existingMaterials: LessonMaterial[];
  pendingMaterials: File[];
}

interface BuilderModule {
  key: string;
  id?: number;
  variant_id?: string;
  title: string;
  lessons: BuilderLesson[];
}

let keyCounter = 0;
const nextKey = () => `k${keyCounter++}`;

function emptyLesson(): BuilderLesson {
  return {
    key: nextKey(),
    title: "",
    description: "",
    videoFile: null,
    hasExistingVideo: false,
    upload: null,
    existingMaterials: [],
    pendingMaterials: [],
  };
}

function emptyModule(defaultTitle = "Module 1"): BuilderModule {
  // Pre-filled (not just a placeholder): most Phase 1 courses are a flat
  // lesson list, so a teacher who never touches the module title still ends
  // up with a valid, savable course instead of a silent validation failure.
  return { key: nextKey(), title: defaultTitle, lessons: [emptyLesson()] };
}

function courseToBuilderState(course: Course) {
  const modules: BuilderModule[] = (course.curriculum || []).map((variant) => ({
    key: nextKey(),
    id: variant.id,
    variant_id: variant.variant_id,
    title: variant.title,
    lessons: (variant.items || variant.variant_items || []).map((item) => ({
      key: nextKey(),
      id: item.id,
      variant_item_id: item.variant_item_id,
      title: item.title,
      description: item.description || "",
      videoFile: null,
      hasExistingVideo: !!item.file,
      upload: null,
      existingMaterials: item.materials || [],
      pendingMaterials: [],
    })),
  }));

  return {
    title: course.title,
    description: course.description || "",
    category: categoryIdOf(course.category),
    level: course.level,
    language: course.language,
    modules: modules.length ? modules : [emptyModule()],
  };
}

export function CourseBuilder({ course }: { course?: Course }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditMode = !!course;

  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [category, setCategory] = useState(categoryIdOf(course?.category));
  const [level, setLevel] = useState(course?.level || "Beginner");
  const [language, setLanguage] = useState(course?.language || "English");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);
  const [pendingCropFileName, setPendingCropFileName] = useState("");
  const [modules, setModules] = useState<BuilderModule[]>(
    course ? courseToBuilderState(course).modules : [emptyModule()]
  );
  const [submissionErrors, setSubmissionErrors] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState<"draft" | "submit" | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const materialInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (course) {
      const state = courseToBuilderState(course);
      setTitle(state.title);
      setDescription(state.description);
      setCategory(state.category);
      setLevel(state.level);
      setLanguage(state.language);
      setModules(state.modules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => courseApi.listCategories() });

  const teacherId = user?.teacher_id;

  const addModule = () => setModules((prev) => [...prev, emptyModule(`Module ${prev.length + 1}`)]);
  const removeModule = (key: string) => {
    const moduleTitle = modules.find((m) => m.key === key)?.title || "this module";
    toast.warning(`Delete "${moduleTitle}"? This will remove all its lessons.`, {
      action: {
        label: "Delete",
        onClick: () => setModules((prev) => prev.filter((m) => m.key !== key)),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };
  const updateModuleTitle = (key: string, value: string) =>
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, title: value } : m)));

  const addLesson = (moduleKey: string) =>
    setModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, lessons: [...m.lessons, emptyLesson()] } : m))
    );

  const removeLesson = (moduleKey: string, lessonKey: string) =>
    setModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, lessons: m.lessons.filter((l) => l.key !== lessonKey) } : m))
    );

  const updateLesson = (moduleKey: string, lessonKey: string, patch: Partial<BuilderLesson>) =>
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? { ...m, lessons: m.lessons.map((l) => (l.key === lessonKey ? { ...l, ...patch } : l)) }
          : m
      )
    );

  const addPendingMaterials = (moduleKey: string, lessonKey: string, files: FileList | null) => {
    if (!files || !files.length) return;
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.key === lessonKey ? { ...l, pendingMaterials: [...l.pendingMaterials, ...Array.from(files)] } : l
              ),
            }
          : m
      )
    );
  };

  const removePendingMaterial = (moduleKey: string, lessonKey: string, index: number) =>
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.key === lessonKey ? { ...l, pendingMaterials: l.pendingMaterials.filter((_, i) => i !== index) } : l
              ),
            }
          : m
      )
    );

  const removeExistingMaterial = async (moduleKey: string, lessonKey: string, lessonId: string, materialId: number) => {
    try {
      await teacherApi.deleteMaterial(lessonId, materialId);
      setModules((prev) =>
        prev.map((m) =>
          m.key === moduleKey
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.key === lessonKey
                    ? { ...l, existingMaterials: l.existingMaterials.filter((mat) => mat.id !== materialId) }
                    : l
                ),
              }
            : m
        )
      );
      toast.success("Material removed.");
    } catch {
      toast.error("Could not remove the material.");
    }
  };

  const handleImageSelected = (file: File | null) => {
    if (!file) return;
    if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
    setPendingCropFileName(file.name);
    setPendingCropSrc(URL.createObjectURL(file));
  };

  const handleCropCancel = () => {
    if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc(null);
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setPendingCropSrc(null);
    setImageFile(croppedFile);
    setImagePreviewUrl(URL.createObjectURL(croppedFile));
  };

  useEffect(() => {
    return () => {
      if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildFormData() {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (category) formData.append("category", category);
    formData.append("level", level);
    formData.append("language", language);
    if (imageFile) formData.append("image", imageFile);

    const curriculum = modules
      .filter((m) => m.title.trim())
      .map((m) => ({
        id: m.id,
        variant_id: m.variant_id,
        variant_title: m.title,
        variant_items: m.lessons
          .filter((l) => l.title.trim())
          .map((l) => ({
            id: l.id,
            variant_item_id: l.variant_item_id,
            title: l.title,
            description: l.description,
          })),
      }));
    formData.append("curriculum", JSON.stringify(curriculum));
    return formData;
  }

  async function saveCourse(): Promise<Course> {
    const formData = buildFormData();
    if (isEditMode && teacherId) {
      return teacherApi.updateCourse(teacherId, course!.id, formData);
    }
    return teacherApi.createCourse(formData);
  }

  async function uploadPendingVideos(savedCourse: Course) {
    const savedLessons = (savedCourse.curriculum || []).flatMap((v) => v.items || v.variant_items || []);

    for (const moduleState of modules) {
      for (const lesson of moduleState.lessons) {
        if (!lesson.videoFile) continue;

        // Match by position within title (created lessons get fresh
        // variant_item_ids we don't know client-side until the save response
        // comes back), falling back to the id we already had in edit mode.
        const target =
          savedLessons.find((s) => s.variant_item_id === lesson.variant_item_id) ||
          savedLessons.find((s) => s.title === lesson.title && !s.file);

        if (!target) continue;

        try {
          await uploadVideoResumable(target.variant_item_id, lesson.videoFile, (progress) => {
            updateLesson(moduleState.key, lesson.key, { upload: progress });
          });
          updateLesson(moduleState.key, lesson.key, { hasExistingVideo: true, videoFile: null });
        } catch {
          toast.error(`Video upload interrupted for "${lesson.title}". You can retry from here.`);
        }
      }
    }
  }

  async function uploadPendingMaterials(savedCourse: Course) {
    const savedLessons = (savedCourse.curriculum || []).flatMap((v) => v.items || v.variant_items || []);

    for (const moduleState of modules) {
      for (const lesson of moduleState.lessons) {
        if (!lesson.pendingMaterials.length) continue;

        const target =
          savedLessons.find((s) => s.variant_item_id === lesson.variant_item_id) ||
          savedLessons.find((s) => s.title === lesson.title);
        if (!target) continue;

        for (const file of lesson.pendingMaterials) {
          try {
            await teacherApi.uploadMaterial(target.variant_item_id, file);
          } catch {
            toast.error(`Could not upload "${file.name}" for "${lesson.title}". You can retry from here.`);
          }
        }
        updateLesson(moduleState.key, lesson.key, { pendingMaterials: [] });
      }
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (action: "draft" | "submit") => {
      setIsSaving(action);
      setSubmissionErrors(null);
      const savedCourse = await saveCourse();
      await uploadPendingVideos(savedCourse);
      await uploadPendingMaterials(savedCourse);

      if (action === "submit" && teacherId) {
        await teacherApi.submitForReview(teacherId, savedCourse.id);
      }
      return savedCourse;
    },
    onSuccess: (savedCourse, action) => {
      setIsSaving(null);
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      toast.success(action === "submit" ? "Course submitted for review." : "Draft saved.");
      router.push(`/teacher/courses/${savedCourse.id}/edit`);
    },
    onError: (error: unknown) => {
      setIsSaving(null);
      if (error instanceof ApiRequestError && Array.isArray((error.body as { errors?: string[] })?.errors)) {
        setSubmissionErrors((error.body as { errors: string[] }).errors);
        toast.error("Cannot submit course. Please fix the issues below.");
        return;
      }
      const message = error instanceof ApiRequestError ? error.message : "Could not save the course.";
      toast.error(message);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                items={Object.fromEntries((categories || []).map((c) => [String(c.id), c.title]))}
                value={category}
                onValueChange={(v) => setCategory(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select
                items={Object.fromEntries(LEVELS.map((l) => [l, l]))}
                value={level}
                onValueChange={(v) => setLevel(v ?? "Beginner")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                items={Object.fromEntries(LANGUAGES.map((l) => [l, l]))}
                value={language}
                onValueChange={(v) => setLanguage(v ?? "English")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Course Image (required, 16:9)</Label>
            {(imagePreviewUrl || course?.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreviewUrl || mediaUrl(course?.image)}
                alt=""
                className="mb-2 aspect-video w-full max-w-sm rounded-md border object-cover"
              />
            )}
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                handleImageSelected(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              After choosing a file you can drag to reposition and zoom to crop it to the required 16:9 frame.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course Curriculum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {modules.map((moduleState, moduleIndex) => (
            <div key={moduleState.key} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  placeholder={`Module ${moduleIndex + 1} title`}
                  value={moduleState.title}
                  onChange={(e) => updateModuleTitle(moduleState.key, e.target.value)}
                  className="font-medium"
                />
                {modules.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-red-600 hover:text-white"
                    onClick={() => removeModule(moduleState.key)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-trash"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                    </svg>
                  </Button>
                )}
              </div>

              <div className="space-y-4 pl-4">
                {moduleState.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.key} className="rounded-md border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Lesson {lessonIndex + 1}</span>
                      {moduleState.lessons.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="ml-auto"
                          onClick={() => removeLesson(moduleState.key, lesson.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Lesson title"
                        value={lesson.title}
                        onChange={(e) => updateLesson(moduleState.key, lesson.key, { title: e.target.value })}
                      />
                      <Textarea
                        placeholder="Lesson description"
                        rows={2}
                        value={lesson.description}
                        onChange={(e) => updateLesson(moduleState.key, lesson.key, { description: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[lesson.key] = el;
                          }}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                          className="hidden"
                          onChange={(e) =>
                            updateLesson(moduleState.key, lesson.key, { videoFile: e.target.files?.[0] || null })
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[lesson.key]?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {lesson.videoFile ? lesson.videoFile.name : "Select Video"}
                        </Button>
                        {lesson.hasExistingVideo && !lesson.videoFile && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Video uploaded
                          </span>
                        )}
                        {!lesson.hasExistingVideo && !lesson.videoFile && (
                          <span className="text-xs text-muted-foreground">No file selected</span>
                        )}
                      </div>
                      {lesson.upload && (
                        <div className="space-y-1">
                          <Progress value={lesson.upload.percent} />
                          <p className="text-xs text-muted-foreground">
                            {lesson.upload.status === "processing"
                              ? "Processing…"
                              : lesson.upload.status === "done"
                                ? "Upload complete"
                                : lesson.upload.status === "error"
                                  ? lesson.upload.message
                                  : `${(lesson.upload.uploadedBytes / 1_000_000).toFixed(1)} MB / ${(lesson.upload.totalBytes / 1_000_000).toFixed(1)} MB (${lesson.upload.percent}%)`}
                          </p>
                        </div>
                      )}

                      <div className="space-y-1.5 border-t pt-2">
                        <Label className="text-xs text-muted-foreground">
                          Learning Materials (PDF, PPT, DOC, XLS — any size)
                        </Label>
                        {lesson.existingMaterials.map((material) => (
                          <div key={material.id} className="flex items-center gap-2 text-sm">
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <a
                              href={mediaUrl(material.file)}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate underline-offset-2 hover:underline"
                            >
                              {material.original_filename || material.file}
                            </a>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="ml-auto shrink-0"
                              onClick={() =>
                                removeExistingMaterial(
                                  moduleState.key,
                                  lesson.key,
                                  lesson.variant_item_id!,
                                  material.id
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-500" />
                            </Button>
                          </div>
                        ))}
                        {lesson.pendingMaterials.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{file.name} (pending upload)</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto shrink-0"
                              onClick={() => removePendingMaterial(moduleState.key, lesson.key, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <input
                          ref={(el) => {
                            materialInputRefs.current[lesson.key] = el;
                          }}
                          type="file"
                          multiple
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            addPendingMaterials(moduleState.key, lesson.key, e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => materialInputRefs.current[lesson.key]?.click()}
                        >
                          <Paperclip className="h-4 w-4" /> Attach Material
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addLesson(moduleState.key)}>
                  <Plus className="h-4 w-4" /> Add Lesson
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addModule}>
            <Plus className="h-4 w-4" /> Add Module
          </Button>
        </CardContent>
      </Card>

      {submissionErrors && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="mb-2 font-medium text-destructive">Cannot submit course. Please fix:</p>
            <ul className="list-inside list-disc text-sm text-destructive">
              {submissionErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate("draft")}
        >
          {isSaving === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Draft
        </Button>
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate("submit")}>
          {isSaving === "submit" && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit for Review
        </Button>
      </div>

      <ImageCropDialog
        open={!!pendingCropSrc}
        imageSrc={pendingCropSrc}
        fileName={pendingCropFileName}
        aspect={16 / 9}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
