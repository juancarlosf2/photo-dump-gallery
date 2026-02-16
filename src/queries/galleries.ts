import { queryOptions } from "@tanstack/react-query";
import {
  getStudioGalleriesFn,
  getGalleryByIdFn,
  getClientGalleryFn,
  getGalleryFeedbackFn,
  getGalleryStatsFn,
} from "~/fn/galleries";

export const studioGalleriesQueryOptions = () =>
  queryOptions({
    queryKey: ["galleries", "studio"],
    queryFn: () => getStudioGalleriesFn(),
  });

export const galleryQueryOptions = (galleryId: string) =>
  queryOptions({
    queryKey: ["gallery", galleryId],
    queryFn: () => getGalleryByIdFn({ data: { id: galleryId } }),
  });

export const clientGalleryQueryOptions = (shareToken: string) =>
  queryOptions({
    queryKey: ["gallery", "client", shareToken],
    queryFn: () => getClientGalleryFn({ data: { shareToken } }),
  });

export const galleryFeedbackQueryOptions = (galleryId: string) =>
  queryOptions({
    queryKey: ["gallery", galleryId, "feedback"],
    queryFn: () => getGalleryFeedbackFn({ data: { galleryId } }),
  });

export const galleryStatsQueryOptions = (galleryId: string) =>
  queryOptions({
    queryKey: ["gallery", galleryId, "stats"],
    queryFn: () => getGalleryStatsFn({ data: { galleryId } }),
  });
