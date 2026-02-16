import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createGallery,
  findGalleryById,
  findGalleryByShareToken,
  findGalleriesByStudioId,
  updateGallery,
  deleteGallery,
  addPhotosToGallery,
  findPhotoById,
  deletePhoto,
  updatePhotoPositions,
  createOrUpdateFeedback,
  findFeedbackByGalleryId,
  getGalleryStats,
  findGalleryWithPhotosAndFeedback,
  findGalleryWithPhotosById,
} from "~/data-access/galleries";
import { createNotification } from "~/data-access/notifications";

// Utility to generate a unique share token
function generateShareToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new gallery
export const createGalleryFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      name: z.string().min(1, "Name is required").max(100),
      description: z.string().max(500).optional(),
      clientName: z.string().max(100).optional(),
      clientEmail: z.string().email().optional().or(z.literal("")),
      allowDownload: z.boolean().optional().default(false),
      expiresAt: z.string().optional(), // ISO date string
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const galleryData = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || null,
      studioId: context.userId,
      clientName: data.clientName || null,
      clientEmail: data.clientEmail || null,
      shareToken: generateShareToken(),
      allowDownload: data.allowDownload,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    };

    const newGallery = await createGallery(galleryData);
    return newGallery;
  });

// Get all galleries for the authenticated user (studio)
export const getStudioGalleriesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findGalleriesByStudioId(context.userId);
  });

// Get a specific gallery by ID (for studio owner)
export const getGalleryByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryWithPhotosById(data.id);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    // Verify ownership
    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    return gallery;
  });

// Get gallery by share token (for clients - no auth required)
export const getClientGalleryFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ shareToken: z.string() }))
  .handler(async ({ data }) => {
    const gallery = await findGalleryWithPhotosAndFeedback(data.shareToken);

    if (!gallery) {
      throw new Error("Gallery not found");
    }

    // Check if gallery is active
    if (!gallery.isActive) {
      throw new Error("This gallery is no longer available");
    }

    // Check if gallery has expired
    if (gallery.expiresAt && new Date(gallery.expiresAt) < new Date()) {
      throw new Error("This gallery has expired");
    }

    // Remove sensitive fields for client view
    const { password, ...clientGallery } = gallery;

    return clientGallery;
  });

// Update gallery settings
export const updateGalleryFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      clientName: z.string().max(100).optional(),
      clientEmail: z.string().email().optional().or(z.literal("")),
      isActive: z.boolean().optional(),
      allowDownload: z.boolean().optional(),
      expiresAt: z.string().optional().nullable(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    const gallery = await findGalleryById(id);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    const updated = await updateGallery(id, {
      ...updateData,
      clientEmail: updateData.clientEmail || null,
      clientName: updateData.clientName || null,
      expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : null,
    });

    return updated;
  });

// Delete a gallery
export const deleteGalleryFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.id);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    await deleteGallery(data.id);
    return { success: true };
  });

// Add photos to a gallery
export const addPhotosToGalleryFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      galleryId: z.string(),
      photos: z.array(
        z.object({
          fileKey: z.string(),
          fileName: z.string().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
        })
      ),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.galleryId);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    // Get current photo count for position
    const existingPhotos = await findGalleryWithPhotosById(data.galleryId);
    const startPosition = existingPhotos?.photos.length || 0;

    const photosToAdd = data.photos.map((photo, index) => ({
      id: crypto.randomUUID(),
      galleryId: data.galleryId,
      fileKey: photo.fileKey,
      fileName: photo.fileName || null,
      fileSize: photo.fileSize || null,
      mimeType: photo.mimeType || null,
      width: photo.width || null,
      height: photo.height || null,
      position: startPosition + index,
    }));

    const addedPhotos = await addPhotosToGallery(photosToAdd);
    return addedPhotos;
  });

// Delete a photo from gallery
export const deletePhotoFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ photoId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const photo = await findPhotoById(data.photoId);
    if (!photo) {
      throw new Error("Photo not found");
    }

    const gallery = await findGalleryById(photo.galleryId);
    if (!gallery || gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    await deletePhoto(data.photoId);
    return { success: true };
  });

// Reorder photos in gallery
export const reorderPhotosFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      galleryId: z.string(),
      positions: z.array(
        z.object({
          id: z.string(),
          position: z.number(),
        })
      ),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.galleryId);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    await updatePhotoPositions(data.positions);
    return { success: true };
  });

// Submit feedback on a photo (for clients - no auth required)
export const submitPhotoFeedbackFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      shareToken: z.string(),
      photoId: z.string(),
      status: z.enum(["pending", "favorite", "approved", "rejected"]),
      comment: z.string().max(500).optional(),
      clientIdentifier: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Verify the gallery is valid and active
    const gallery = await findGalleryByShareToken(data.shareToken);
    if (!gallery || !gallery.isActive) {
      throw new Error("Gallery not available");
    }

    if (gallery.expiresAt && new Date(gallery.expiresAt) < new Date()) {
      throw new Error("This gallery has expired");
    }

    // Verify the photo belongs to this gallery
    const photo = await findPhotoById(data.photoId);
    if (!photo || photo.galleryId !== gallery.id) {
      throw new Error("Photo not found in this gallery");
    }

    const feedback = await createOrUpdateFeedback({
      id: crypto.randomUUID(),
      photoId: data.photoId,
      galleryId: gallery.id,
      status: data.status,
      comment: data.comment || null,
      clientIdentifier: data.clientIdentifier || null,
    });

    // Create notification for studio owner if feedback is significant
    if (data.status !== "pending") {
      const statusLabel = data.status === "favorite" ? "favorited" : data.status;
      await createNotification({
        id: crypto.randomUUID(),
        userId: gallery.studioId,
        type: "gallery-feedback",
        title: "New photo feedback",
        content: `${gallery.clientName || "A client"} ${statusLabel} a photo in "${gallery.name}"${data.comment ? `: "${data.comment}"` : ""}`,
        relatedId: gallery.id,
        relatedType: "gallery",
        isRead: false,
      });
    }

    return feedback;
  });

// Get feedback summary for a gallery (for studio owner)
export const getGalleryFeedbackFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ galleryId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.galleryId);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    const feedback = await findFeedbackByGalleryId(data.galleryId);
    const stats = await getGalleryStats(data.galleryId);

    return { feedback, stats };
  });

// Get gallery stats
export const getGalleryStatsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ galleryId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.galleryId);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    return await getGalleryStats(data.galleryId);
  });

// Regenerate share token
export const regenerateShareTokenFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ galleryId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const gallery = await findGalleryById(data.galleryId);
    if (!gallery) {
      throw new Error("Gallery not found");
    }

    if (gallery.studioId !== context.userId) {
      throw new Error("Unauthorized: You don't own this gallery");
    }

    const updated = await updateGallery(data.galleryId, {
      shareToken: generateShareToken(),
    });

    return updated;
  });
