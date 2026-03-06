import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Heart,
  Check,
  X,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageOff,
} from "lucide-react";
import { Button, Chip, TextArea, Modal } from "@heroui/react";
import { Page } from "~/components/Page";
import { Panel } from "~/components/ui/panel";
import { cn } from "~/lib/utils";
import { useClientGallery, useSubmitPhotoFeedback } from "~/hooks/useGalleries";
import { clientGalleryQueryOptions } from "~/queries/galleries";
import { getAttachmentUrlFn } from "~/fn/attachments";
import { useQuery } from "@tanstack/react-query";
import type { PhotoFeedbackStatus } from "~/db/schema";
import type { GalleryPhotoWithFeedback } from "~/data-access/galleries";

export const Route = createFileRoute("/gallery/$shareToken")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    try {
      // Invalid or expired share tokens should render the route-level unavailable
      // state instead of tripping the app-wide error boundary during preload.
      await queryClient.ensureQueryData(clientGalleryQueryOptions(params.shareToken));
    } catch {
      return;
    }
  },
  component: ClientGalleryPortal,
});

type FilterType = "all" | "pending" | "favorite" | "approved" | "rejected";

function getGalleryUnavailableMessage(error: unknown) {
  const fallbackMessage = "This gallery link may be invalid, expired, or the gallery is no longer active.";

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  switch (error.message) {
    case "Gallery not found":
    case "This gallery is no longer available":
    case "This gallery has expired":
      return fallbackMessage;
    default:
      return error.message || fallbackMessage;
  }
}

function PhotoThumbnail({
  photo,
  onClick,
  isSelected,
}: {
  photo: GalleryPhotoWithFeedback;
  onClick: () => void;
  isSelected: boolean;
}) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["attachment-url", photo.fileKey],
    queryFn: async () => {
      const { url } = await getAttachmentUrlFn({ data: { fileKey: photo.fileKey } });
      return url;
    },
    staleTime: 30 * 60 * 1000,
  });

  const [imageError, setImageError] = useState(false);
  const status = photo.feedback?.status as PhotoFeedbackStatus | undefined;

  const getStatusBadge = () => {
    switch (status) {
      case "favorite":
        return (
          <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1.5">
            <Heart className="h-3 w-3 fill-current" />
          </div>
        );
      case "approved":
        return (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
            <Check className="h-3 w-3" />
          </div>
        );
      case "rejected":
        return (
          <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5">
            <X className="h-3 w-3" />
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="aspect-square bg-surface-secondary animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (imageError || !url) {
    return (
      <div className="aspect-square bg-surface-secondary rounded-lg flex items-center justify-center">
        <ImageOff className="h-6 w-6 text-muted" />
      </div>
    );
  }

  return (
    <button
      className={cn(
        "relative aspect-square bg-surface-secondary overflow-hidden rounded-lg group cursor-pointer transition-all duration-200",
        isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      onClick={onClick}
    >
      <img
        src={url}
        alt={photo.fileName || "Gallery photo"}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      {getStatusBadge()}
      {photo.feedback?.comment && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white rounded-full p-1.5">
          <MessageSquare className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

function PhotoLightbox({
  photo,
  shareToken,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  allowDownload,
}: {
  photo: GalleryPhotoWithFeedback;
  shareToken: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  allowDownload: boolean;
}) {
  const { data: url } = useQuery({
    queryKey: ["attachment-url", photo.fileKey],
    queryFn: async () => {
      const { url } = await getAttachmentUrlFn({ data: { fileKey: photo.fileKey } });
      return url;
    },
    staleTime: 30 * 60 * 1000,
  });

  const [comment, setComment] = useState(photo.feedback?.comment || "");
  const submitFeedback = useSubmitPhotoFeedback();
  const currentStatus = (photo.feedback?.status as PhotoFeedbackStatus) || "pending";

  const handleStatusChange = async (status: PhotoFeedbackStatus) => {
    await submitFeedback.mutateAsync({
      shareToken,
      photoId: photo.id,
      status,
      comment: comment || undefined,
    });
  };

  const handleCommentSubmit = async () => {
    await submitFeedback.mutateAsync({
      shareToken,
      photoId: photo.id,
      status: currentStatus,
      comment: comment || undefined,
    });
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <span className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="auto" className="max-w-6xl w-full">
          <Modal.Dialog className="bg-black/95 max-h-[95vh] overflow-hidden">
            <Modal.CloseTrigger />
            <Modal.Header className="text-white border-b border-white/10">
              <Modal.Heading className="text-sm text-white/70">
                {photo.fileName || "Photo"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-0 overflow-hidden">
              <div className="flex flex-col md:flex-row gap-4 p-4 max-h-[calc(95vh-120px)] overflow-auto">
                {/* Image area */}
                <div className="flex-1 relative flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                  {hasPrev && (
                    <Button
                      variant="ghost"
                      isIconOnly
                      onPress={onPrev}
                      className="absolute left-2 z-10 bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  )}
                  {url && (
                    <img
                      src={url}
                      alt={photo.fileName || "Gallery photo"}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                  {hasNext && (
                    <Button
                      variant="ghost"
                      isIconOnly
                      onPress={onNext}
                      className="absolute right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  )}
                </div>

                {/* Feedback panel */}
                <div className="w-full md:w-80 bg-background rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Your Feedback</h3>

                  {/* Status buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={currentStatus === "favorite" ? "primary" : "outline"}
                      className={cn(
                        "gap-2",
                        currentStatus === "favorite" && "bg-pink-500 text-white border-pink-500 hover:bg-pink-600"
                      )}
                      onPress={() => handleStatusChange("favorite")}
                      isDisabled={submitFeedback.isPending}
                    >
                      <Heart className={cn("h-4 w-4", currentStatus === "favorite" && "fill-current")} />
                      Favorite
                    </Button>
                    <Button
                      variant={currentStatus === "approved" ? "primary" : "outline"}
                      className={cn(
                        "gap-2",
                        currentStatus === "approved" && "bg-green-500 text-white border-green-500 hover:bg-green-600"
                      )}
                      onPress={() => handleStatusChange("approved")}
                      isDisabled={submitFeedback.isPending}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant={currentStatus === "rejected" ? "primary" : "outline"}
                      className={cn(
                        "gap-2",
                        currentStatus === "rejected" && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                      )}
                      onPress={() => handleStatusChange("rejected")}
                      isDisabled={submitFeedback.isPending}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant={currentStatus === "pending" ? "primary" : "outline"}
                      className="gap-2"
                      onPress={() => handleStatusChange("pending")}
                      isDisabled={submitFeedback.isPending}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Comment section */}
                  <div className="space-y-2">
                    <label htmlFor="comment" className="text-sm font-medium">
                      Comment (optional)
                    </label>
                    <TextArea
                      id="comment"
                      placeholder="Add notes about this photo..."
                      value={comment}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onPress={handleCommentSubmit}
                      isDisabled={submitFeedback.isPending || comment === (photo.feedback?.comment || "")}
                    >
                      {submitFeedback.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Comment
                    </Button>
                  </div>

                  {/* Download button */}
                  {allowDownload && url && (
                    <a
                      href={url}
                      download={photo.fileName || "photo"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ClientGalleryPortal() {
  const { shareToken } = Route.useParams();
  const { data: gallery, isLoading, error } = useClientGallery(shareToken);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const unavailableMessage = getGalleryUnavailableMessage(error);

  const filteredPhotos = useMemo(() => {
    if (!gallery?.photos) return [];
    if (filter === "all") return gallery.photos;
    return gallery.photos.filter((photo) => {
      const status = photo.feedback?.status || "pending";
      return status === filter;
    });
  }, [gallery?.photos, filter]);

  const stats = useMemo(() => {
    if (!gallery?.photos) return { total: 0, pending: 0, favorite: 0, approved: 0, rejected: 0 };

    const result = { total: gallery.photos.length, pending: 0, favorite: 0, approved: 0, rejected: 0 };
    for (const photo of gallery.photos) {
      const status = (photo.feedback?.status || "pending") as keyof typeof result;
      if (status in result) {
        result[status]++;
      }
    }
    return result;
  }, [gallery?.photos]);

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Page>
    );
  }

  if (error || !gallery) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <ImageOff className="h-16 w-16 text-muted mb-4" />
          <h1 className="text-2xl font-bold mb-2">Gallery Not Available</h1>
          <p className="text-muted max-w-md">{unavailableMessage}</p>
        </div>
      </Page>
    );
  }

  const selectedPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  return (
    <Page>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{gallery.name}</h1>
          {gallery.description && (
            <p className="text-muted max-w-2xl mx-auto">{gallery.description}</p>
          )}
          <p className="text-sm text-muted">
            Shared by {gallery.studio.name}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-3">
          <Chip variant="tertiary" className="px-3 py-1">
            {stats.total} photos
          </Chip>
          {stats.favorite > 0 && (
            <Chip variant="tertiary" className="px-3 py-1 bg-pink-500/10 text-pink-600 border-pink-500/20">
              <Heart className="h-3 w-3 mr-1 fill-current" />
              {stats.favorite} favorites
            </Chip>
          )}
          {stats.approved > 0 && (
            <Chip variant="tertiary" className="px-3 py-1 bg-green-500/10 text-green-600 border-green-500/20">
              <Check className="h-3 w-3 mr-1" />
              {stats.approved} approved
            </Chip>
          )}
          {stats.rejected > 0 && (
            <Chip variant="tertiary" className="px-3 py-1 bg-red-500/10 text-red-600 border-red-500/20">
              <X className="h-3 w-3 mr-1" />
              {stats.rejected} rejected
            </Chip>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={filter === "all" ? "primary" : "outline"}
            size="sm"
            onPress={() => setFilter("all")}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filter === "pending" ? "primary" : "outline"}
            size="sm"
            onPress={() => setFilter("pending")}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filter === "favorite" ? "primary" : "outline"}
            size="sm"
            onPress={() => setFilter("favorite")}
            className={filter === "favorite" ? "bg-pink-500" : ""}
          >
            <Heart className="h-3 w-3 mr-1" />
            Favorites ({stats.favorite})
          </Button>
          <Button
            variant={filter === "approved" ? "primary" : "outline"}
            size="sm"
            onPress={() => setFilter("approved")}
            className={filter === "approved" ? "bg-green-500" : ""}
          >
            <Check className="h-3 w-3 mr-1" />
            Approved ({stats.approved})
          </Button>
          <Button
            variant={filter === "rejected" ? "primary" : "outline"}
            size="sm"
            onPress={() => setFilter("rejected")}
            className={filter === "rejected" ? "bg-red-500" : ""}
          >
            <X className="h-3 w-3 mr-1" />
            Rejected ({stats.rejected})
          </Button>
        </div>

        {/* Photo grid */}
        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredPhotos.map((photo, index) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onClick={() => setSelectedPhotoIndex(index)}
                isSelected={selectedPhotoIndex === index}
              />
            ))}
          </div>
        ) : (
          <Panel className="p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted mb-3" />
            <p className="text-muted">
              {filter === "all"
                ? "No photos in this gallery yet."
                : `No ${filter} photos.`}
            </p>
          </Panel>
        )}

        {/* Instructions */}
        <Panel className="p-4 bg-surface-secondary/30">
          <h3 className="font-semibold mb-2">How to provide feedback:</h3>
          <ul className="text-sm text-muted space-y-1">
            <li>Click on any photo to open it and provide your feedback</li>
            <li><Heart className="h-3 w-3 inline text-pink-500 fill-pink-500" /> <strong>Favorite</strong> - Mark photos you love the most</li>
            <li><Check className="h-3 w-3 inline text-green-500" /> <strong>Approve</strong> - Photos you want to include in the final delivery</li>
            <li><X className="h-3 w-3 inline text-red-500" /> <strong>Reject</strong> - Photos you don't want included</li>
            <li>Add optional comments for specific requests or notes</li>
          </ul>
        </Panel>
      </div>

      {/* Lightbox */}
      {selectedPhoto && selectedPhotoIndex !== null && (
        <PhotoLightbox
          photo={selectedPhoto}
          shareToken={shareToken}
          onClose={() => setSelectedPhotoIndex(null)}
          onPrev={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
          onNext={() => setSelectedPhotoIndex(Math.min(filteredPhotos.length - 1, selectedPhotoIndex + 1))}
          hasPrev={selectedPhotoIndex > 0}
          hasNext={selectedPhotoIndex < filteredPhotos.length - 1}
          allowDownload={gallery.allowDownload}
        />
      )}
    </Page>
  );
}
