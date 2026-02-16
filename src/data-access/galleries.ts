import { eq, desc, and, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  clientGallery,
  galleryPhoto,
  photoFeedback,
  user,
  type ClientGallery,
  type CreateClientGalleryData,
  type UpdateClientGalleryData,
  type GalleryPhoto,
  type CreateGalleryPhotoData,
  type PhotoFeedback,
  type CreatePhotoFeedbackData,
  type UpdatePhotoFeedbackData,
  type User,
  type PhotoFeedbackStatus,
} from "~/db/schema";

// Types for gallery with relations
export type GalleryWithStudio = ClientGallery & {
  studio: Pick<User, "id" | "name" | "image">;
};

export type GalleryWithPhotos = ClientGallery & {
  studio: Pick<User, "id" | "name" | "image">;
  photos: GalleryPhotoWithFeedback[];
};

export type GalleryPhotoWithFeedback = GalleryPhoto & {
  feedback: PhotoFeedback | null;
};

export type GalleryStats = {
  total: number;
  pending: number;
  favorite: number;
  approved: number;
  rejected: number;
};

// Gallery CRUD operations
export async function createGallery(
  data: CreateClientGalleryData
): Promise<ClientGallery> {
  const [newGallery] = await database
    .insert(clientGallery)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newGallery;
}

export async function findGalleryById(id: string): Promise<ClientGallery | null> {
  const [result] = await database
    .select()
    .from(clientGallery)
    .where(eq(clientGallery.id, id))
    .limit(1);

  return result || null;
}

export async function findGalleryByShareToken(
  shareToken: string
): Promise<GalleryWithStudio | null> {
  const [result] = await database
    .select({
      id: clientGallery.id,
      name: clientGallery.name,
      description: clientGallery.description,
      studioId: clientGallery.studioId,
      clientName: clientGallery.clientName,
      clientEmail: clientGallery.clientEmail,
      shareToken: clientGallery.shareToken,
      isActive: clientGallery.isActive,
      expiresAt: clientGallery.expiresAt,
      allowDownload: clientGallery.allowDownload,
      requiresPassword: clientGallery.requiresPassword,
      password: clientGallery.password,
      createdAt: clientGallery.createdAt,
      updatedAt: clientGallery.updatedAt,
      studio: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(clientGallery)
    .innerJoin(user, eq(clientGallery.studioId, user.id))
    .where(eq(clientGallery.shareToken, shareToken))
    .limit(1);

  return result || null;
}

export async function findGalleriesByStudioId(
  studioId: string
): Promise<GalleryWithStudio[]> {
  const results = await database
    .select({
      id: clientGallery.id,
      name: clientGallery.name,
      description: clientGallery.description,
      studioId: clientGallery.studioId,
      clientName: clientGallery.clientName,
      clientEmail: clientGallery.clientEmail,
      shareToken: clientGallery.shareToken,
      isActive: clientGallery.isActive,
      expiresAt: clientGallery.expiresAt,
      allowDownload: clientGallery.allowDownload,
      requiresPassword: clientGallery.requiresPassword,
      password: clientGallery.password,
      createdAt: clientGallery.createdAt,
      updatedAt: clientGallery.updatedAt,
      studio: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(clientGallery)
    .innerJoin(user, eq(clientGallery.studioId, user.id))
    .where(eq(clientGallery.studioId, studioId))
    .orderBy(desc(clientGallery.createdAt));

  return results;
}

export async function updateGallery(
  galleryId: string,
  data: UpdateClientGalleryData
): Promise<ClientGallery | null> {
  const [updated] = await database
    .update(clientGallery)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(clientGallery.id, galleryId))
    .returning();

  return updated || null;
}

export async function deleteGallery(galleryId: string): Promise<boolean> {
  const [deleted] = await database
    .delete(clientGallery)
    .where(eq(clientGallery.id, galleryId))
    .returning();

  return deleted !== undefined;
}

// Gallery Photo operations
export async function addPhotosToGallery(
  photos: CreateGalleryPhotoData[]
): Promise<GalleryPhoto[]> {
  if (photos.length === 0) return [];

  const newPhotos = await database
    .insert(galleryPhoto)
    .values(photos)
    .returning();

  return newPhotos;
}

export async function findPhotosByGalleryId(
  galleryId: string
): Promise<GalleryPhoto[]> {
  return await database
    .select()
    .from(galleryPhoto)
    .where(eq(galleryPhoto.galleryId, galleryId))
    .orderBy(galleryPhoto.position);
}

export async function findPhotosWithFeedbackByGalleryId(
  galleryId: string
): Promise<GalleryPhotoWithFeedback[]> {
  const photos = await database
    .select()
    .from(galleryPhoto)
    .where(eq(galleryPhoto.galleryId, galleryId))
    .orderBy(galleryPhoto.position);

  const feedbacks = await database
    .select()
    .from(photoFeedback)
    .where(eq(photoFeedback.galleryId, galleryId));

  const feedbackMap = new Map<string, PhotoFeedback>();
  for (const fb of feedbacks) {
    feedbackMap.set(fb.photoId, fb);
  }

  return photos.map((photo) => ({
    ...photo,
    feedback: feedbackMap.get(photo.id) || null,
  }));
}

export async function findPhotoById(id: string): Promise<GalleryPhoto | null> {
  const [result] = await database
    .select()
    .from(galleryPhoto)
    .where(eq(galleryPhoto.id, id))
    .limit(1);

  return result || null;
}

export async function deletePhoto(photoId: string): Promise<boolean> {
  const [deleted] = await database
    .delete(galleryPhoto)
    .where(eq(galleryPhoto.id, photoId))
    .returning();

  return deleted !== undefined;
}

export async function updatePhotoPositions(
  positions: { id: string; position: number }[]
): Promise<void> {
  for (const { id, position } of positions) {
    await database
      .update(galleryPhoto)
      .set({ position })
      .where(eq(galleryPhoto.id, id));
  }
}

// Photo Feedback operations
export async function createOrUpdateFeedback(
  data: CreatePhotoFeedbackData
): Promise<PhotoFeedback> {
  // Check if feedback already exists for this photo
  const [existing] = await database
    .select()
    .from(photoFeedback)
    .where(eq(photoFeedback.photoId, data.photoId))
    .limit(1);

  if (existing) {
    // Update existing feedback
    const [updated] = await database
      .update(photoFeedback)
      .set({
        status: data.status,
        comment: data.comment,
        clientIdentifier: data.clientIdentifier,
        updatedAt: new Date(),
      })
      .where(eq(photoFeedback.id, existing.id))
      .returning();
    return updated;
  }

  // Create new feedback
  const [newFeedback] = await database
    .insert(photoFeedback)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newFeedback;
}

export async function findFeedbackByPhotoId(
  photoId: string
): Promise<PhotoFeedback | null> {
  const [result] = await database
    .select()
    .from(photoFeedback)
    .where(eq(photoFeedback.photoId, photoId))
    .limit(1);

  return result || null;
}

export async function findFeedbackByGalleryId(
  galleryId: string
): Promise<PhotoFeedback[]> {
  return await database
    .select()
    .from(photoFeedback)
    .where(eq(photoFeedback.galleryId, galleryId))
    .orderBy(desc(photoFeedback.updatedAt));
}

export async function updateFeedback(
  feedbackId: string,
  data: UpdatePhotoFeedbackData
): Promise<PhotoFeedback | null> {
  const [updated] = await database
    .update(photoFeedback)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(photoFeedback.id, feedbackId))
    .returning();

  return updated || null;
}

export async function deleteFeedback(photoId: string): Promise<boolean> {
  const [deleted] = await database
    .delete(photoFeedback)
    .where(eq(photoFeedback.photoId, photoId))
    .returning();

  return deleted !== undefined;
}

// Gallery Stats
export async function getGalleryStats(galleryId: string): Promise<GalleryStats> {
  const photos = await findPhotosByGalleryId(galleryId);
  const feedbacks = await findFeedbackByGalleryId(galleryId);

  const feedbackMap = new Map<string, PhotoFeedbackStatus>();
  for (const fb of feedbacks) {
    feedbackMap.set(fb.photoId, fb.status as PhotoFeedbackStatus);
  }

  const stats: GalleryStats = {
    total: photos.length,
    pending: 0,
    favorite: 0,
    approved: 0,
    rejected: 0,
  };

  for (const photo of photos) {
    const status = feedbackMap.get(photo.id) || "pending";
    stats[status]++;
  }

  return stats;
}

// Full gallery with photos and feedback
export async function findGalleryWithPhotosAndFeedback(
  shareToken: string
): Promise<GalleryWithPhotos | null> {
  const gallery = await findGalleryByShareToken(shareToken);
  if (!gallery) return null;

  const photos = await findPhotosWithFeedbackByGalleryId(gallery.id);

  return {
    ...gallery,
    photos,
  };
}

export async function findGalleryWithPhotosById(
  galleryId: string
): Promise<GalleryWithPhotos | null> {
  const [galleryResult] = await database
    .select({
      id: clientGallery.id,
      name: clientGallery.name,
      description: clientGallery.description,
      studioId: clientGallery.studioId,
      clientName: clientGallery.clientName,
      clientEmail: clientGallery.clientEmail,
      shareToken: clientGallery.shareToken,
      isActive: clientGallery.isActive,
      expiresAt: clientGallery.expiresAt,
      allowDownload: clientGallery.allowDownload,
      requiresPassword: clientGallery.requiresPassword,
      password: clientGallery.password,
      createdAt: clientGallery.createdAt,
      updatedAt: clientGallery.updatedAt,
      studio: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(clientGallery)
    .innerJoin(user, eq(clientGallery.studioId, user.id))
    .where(eq(clientGallery.id, galleryId))
    .limit(1);

  if (!galleryResult) return null;

  const photos = await findPhotosWithFeedbackByGalleryId(galleryId);

  return {
    ...galleryResult,
    photos,
  };
}
