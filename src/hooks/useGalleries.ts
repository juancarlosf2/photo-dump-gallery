import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@heroui/react";
import {
  studioGalleriesQueryOptions,
  galleryQueryOptions,
  clientGalleryQueryOptions,
  galleryFeedbackQueryOptions,
  galleryStatsQueryOptions,
} from "~/queries/galleries";
import {
  createGalleryFn,
  updateGalleryFn,
  deleteGalleryFn,
  addPhotosToGalleryFn,
  deletePhotoFn,
  reorderPhotosFn,
  submitPhotoFeedbackFn,
  regenerateShareTokenFn,
} from "~/fn/galleries";
import { getErrorMessage } from "~/utils/error";
import type { PhotoFeedbackStatus } from "~/db/schema";

// Query hooks

export function useStudioGalleries(enabled = true) {
  return useQuery({
    ...studioGalleriesQueryOptions(),
    enabled,
  });
}

export function useGallery(galleryId: string, enabled = true) {
  return useQuery({
    ...galleryQueryOptions(galleryId),
    enabled: enabled && !!galleryId,
  });
}

export function useClientGallery(shareToken: string, enabled = true) {
  return useQuery({
    ...clientGalleryQueryOptions(shareToken),
    enabled: enabled && !!shareToken,
    retry: false,
  });
}

export function useGalleryFeedback(galleryId: string, enabled = true) {
  return useQuery({
    ...galleryFeedbackQueryOptions(galleryId),
    enabled: enabled && !!galleryId,
  });
}

export function useGalleryStats(galleryId: string, enabled = true) {
  return useQuery({
    ...galleryStatsQueryOptions(galleryId),
    enabled: enabled && !!galleryId,
  });
}

// Mutation hooks

interface CreateGalleryData {
  name: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  allowDownload?: boolean;
  expiresAt?: string;
}

export function useCreateGallery() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateGalleryData) => createGalleryFn({ data }),
    onSuccess: (newGallery) => {
      toast.success("Gallery created!", {
        description: "Your new gallery is ready for photos.",
      });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      navigate({ to: "/dashboard/galleries/$galleryId", params: { galleryId: newGallery.id } });
    },
    onError: (error) => {
      toast.danger("Failed to create gallery", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateGalleryData {
  id: string;
  name?: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  isActive?: boolean;
  allowDownload?: boolean;
  expiresAt?: string | null;
}

export function useUpdateGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGalleryData) => updateGalleryFn({ data }),
    onSuccess: (updatedGallery) => {
      toast.success("Gallery updated", {
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      queryClient.invalidateQueries({ queryKey: ["gallery", updatedGallery?.id] });
    },
    onError: (error) => {
      toast.danger("Failed to update gallery", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteGallery() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => deleteGalleryFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Gallery deleted", {
        description: "The gallery has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      navigate({ to: "/dashboard/galleries" });
    },
    onError: (error) => {
      toast.danger("Failed to delete gallery", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface AddPhotosData {
  galleryId: string;
  photos: {
    fileKey: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    width?: number;
    height?: number;
  }[];
}

export function useAddPhotosToGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddPhotosData) => addPhotosToGalleryFn({ data }),
    onSuccess: (_, variables) => {
      toast.success("Photos added", {
        description: `${variables.photos.length} photo${variables.photos.length > 1 ? "s" : ""} added to the gallery.`,
      });
      queryClient.invalidateQueries({ queryKey: ["gallery", variables.galleryId] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
    },
    onError: (error) => {
      toast.danger("Failed to add photos", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => deletePhotoFn({ data: { photoId } }),
    onSuccess: () => {
      toast.success("Photo removed", {
        description: "The photo has been removed from the gallery.",
      });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
    },
    onError: (error) => {
      toast.danger("Failed to remove photo", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface ReorderPhotosData {
  galleryId: string;
  positions: { id: string; position: number }[];
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderPhotosData) => reorderPhotosFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery", variables.galleryId] });
    },
    onError: (error) => {
      toast.danger("Failed to reorder photos", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface SubmitFeedbackData {
  shareToken: string;
  photoId: string;
  status: PhotoFeedbackStatus;
  comment?: string;
  clientIdentifier?: string;
}

export function useSubmitPhotoFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitFeedbackData) => submitPhotoFeedbackFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery", "client", variables.shareToken] });
    },
    onError: (error) => {
      toast.danger("Failed to submit feedback", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useRegenerateShareToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (galleryId: string) => regenerateShareTokenFn({ data: { galleryId } }),
    onSuccess: (updatedGallery) => {
      toast.success("Share link regenerated", {
        description: "The old link will no longer work.",
      });
      queryClient.invalidateQueries({ queryKey: ["gallery", updatedGallery?.id] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
    },
    onError: (error) => {
      toast.danger("Failed to regenerate link", {
        description: getErrorMessage(error),
      });
    },
  });
}
