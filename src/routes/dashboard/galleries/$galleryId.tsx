import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  Home,
  Images,
  Upload,
  Share2,
  Copy,
  Trash2,
  Settings,
  Heart,
  Check,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  ImageOff,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { Page } from "~/components/Page";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import {
  Button,
  Chip,
  Modal,
  Input,
  TextArea,
  Switch,
  Tabs,
  Card,
} from "@heroui/react";
import { Panel } from "~/components/ui/panel";
import { toast } from "@heroui/react";
import { ButtonLink } from "~/components/ui/link";
import { useDropzone } from "react-dropzone";
import { cn } from "~/lib/utils";
import {
  useGallery,
  useUpdateGallery,
  useAddPhotosToGallery,
  useDeletePhoto,
  useRegenerateShareToken,
} from "~/hooks/useGalleries";
import { galleryQueryOptions } from "~/queries/galleries";
import { getMediaUploadUrlFn, getAttachmentUrlFn } from "~/fn/attachments";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PhotoFeedbackStatus } from "~/db/schema";
import type { GalleryPhotoWithFeedback } from "~/data-access/galleries";

export const Route = createFileRoute("/dashboard/galleries/$galleryId")({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    await queryClient.ensureQueryData(galleryQueryOptions(params.galleryId));
  },
  component: GalleryManagementPage,
});

function PhotoThumbnail({
  photo,
  onDelete,
  isDeleting,
}: {
  photo: GalleryPhotoWithFeedback;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["attachment-url", photo.fileKey],
    queryFn: async () => {
      const { url } = await getAttachmentUrlFn({
        data: { fileKey: photo.fileKey },
      });
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
          <div className="absolute top-2 left-2 bg-pink-500 text-white rounded-full p-1.5">
            <Heart className="h-3 w-3 fill-current" />
          </div>
        );
      case "approved":
        return (
          <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1.5">
            <Check className="h-3 w-3" />
          </div>
        );
      case "rejected":
        return (
          <div className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5">
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
      <div className="aspect-square bg-surface-secondary rounded-lg flex items-center justify-center relative group">
        <ImageOff className="h-6 w-6 text-muted" />
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-red-500"
          onPress={onDelete}
          isDisabled={isDeleting}
          aria-label={`Delete ${photo.fileName || "photo"}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-surface-secondary overflow-hidden rounded-lg group">
      <img
        src={url}
        alt={photo.fileName || "Gallery photo"}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
      {getStatusBadge()}
      {photo.feedback?.comment && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white rounded-full p-1.5">
          <MessageSquare className="h-3 w-3" />
        </div>
      )}
      <Button
        variant="ghost"
        isIconOnly
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-red-500"
        onPress={onDelete}
        isDisabled={isDeleting}
        aria-label={`Delete ${photo.fileName || "photo"}`}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

function PhotoUploader({
  galleryId,
  onUploadComplete,
}: {
  galleryId: string;
  onUploadComplete: () => void;
}) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const addPhotos = useAddPhotosToGallery();

  const uploadFile = async (
    file: File,
  ): Promise<{
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null> => {
    try {
      // Get presigned URL
      const { presignedUrl, fileKey } = await getMediaUploadUrlFn({
        data: {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        },
      });

      // Upload file
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file
                  ? { ...f, progress, status: "uploading" as const }
                  : f,
              ),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === file
                  ? { ...f, progress: 100, status: "done" as const }
                  : f,
              ),
            );
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      return {
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        ),
      );
      return null;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload all files
      const results = await Promise.all(acceptedFiles.map(uploadFile));
      const successfulUploads = results.filter(
        (r): r is NonNullable<typeof r> => r !== null,
      );

      if (successfulUploads.length > 0) {
        await addPhotos.mutateAsync({
          galleryId,
          photos: successfulUploads,
        });
        onUploadComplete();
      }

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadingFiles((prev) =>
          prev.filter((f) => f.status === "uploading"),
        );
      }, 2000);
    },
    [galleryId, addPhotos, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-accent bg-accent/5"
            : "border-separator/25 hover:border-accent/50",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted mb-3" />
        <p className="text-sm font-medium">
          {isDragActive
            ? "Drop photos here..."
            : "Drag & drop photos, or click to select"}
        </p>
        <p className="text-xs text-muted mt-1">
          JPG, PNG, GIF, or WebP (max 5MB each)
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 bg-surface-secondary/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.file.name}</p>
                <div className="h-1 bg-surface-secondary rounded-full mt-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      file.status === "error" ? "bg-red-500" : "bg-accent",
                    )}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0">
                {file.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                )}
                {file.status === "done" && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {file.status === "error" && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsModal({
  gallery,
  isOpen,
  onClose,
}: {
  gallery: NonNullable<ReturnType<typeof useGallery>["data"]>;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(gallery.name);
  const [description, setDescription] = useState(gallery.description || "");
  const [clientName, setClientName] = useState(gallery.clientName || "");
  const [clientEmail, setClientEmail] = useState(gallery.clientEmail || "");
  const [allowDownload, setAllowDownload] = useState(gallery.allowDownload);
  const [isActive, setIsActive] = useState(gallery.isActive);
  const updateGallery = useUpdateGallery();
  const regenerateToken = useRegenerateShareToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateGallery.mutateAsync({
      id: gallery.id,
      name: name.trim(),
      description: description.trim() || undefined,
      clientName: clientName.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      allowDownload,
      isActive,
    });
    onClose();
  };

  const handleRegenerateToken = async () => {
    if (confirm("This will invalidate the current share link. Are you sure?")) {
      await regenerateToken.mutateAsync(gallery.id);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <span className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="auto" size="lg">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger />
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>Gallery Settings</Modal.Heading>
                <p className="text-sm text-muted">
                  Update client details, sharing permissions, and gallery
                  status.
                </p>
              </Modal.Header>
              <Modal.Body className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="settings-gallery-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Gallery Name
                  </label>
                  <Input
                    id="settings-gallery-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="settings-gallery-description"
                    className="text-sm font-medium text-foreground"
                  >
                    Description
                  </label>
                  <TextArea
                    id="settings-gallery-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="settings-client-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Client Name
                  </label>
                  <Input
                    id="settings-client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="settings-client-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Client Email
                  </label>
                  <Input
                    id="settings-client-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-default-50/30 px-4 py-3">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="settings-allow-download"
                      className="text-sm font-medium text-foreground"
                    >
                      Allow downloads
                    </label>
                    <p className="text-xs text-muted">
                      Clients can download original files from this gallery.
                    </p>
                  </div>
                  <Switch
                    id="settings-allow-download"
                    isSelected={allowDownload}
                    onChange={setAllowDownload}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-default-50/30 px-4 py-3">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="settings-gallery-active"
                      className="text-sm font-medium text-foreground"
                    >
                      Gallery active
                    </label>
                    <p className="text-xs text-muted">
                      Inactive galleries cannot be accessed with share links.
                    </p>
                  </div>
                  <Switch
                    id="settings-gallery-active"
                    isSelected={isActive}
                    onChange={setIsActive}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onPress={handleRegenerateToken}
                    isDisabled={regenerateToken.isPending}
                  >
                    {regenerateToken.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Regenerate Share Link
                  </Button>
                  <p className="text-xs text-muted mt-1">
                    This will create a new share link and invalidate the old
                    one.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-end gap-3">
                <Button variant="outline" slot="close">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isDisabled={!name.trim()}
                  isPending={updateGallery.isPending}
                >
                  {updateGallery.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function FeedbackItem({ photo }: { photo: GalleryPhotoWithFeedback }) {
  const { data: url } = useQuery({
    queryKey: ["attachment-url", photo.fileKey],
    queryFn: async () => {
      const { url } = await getAttachmentUrlFn({
        data: { fileKey: photo.fileKey },
      });
      return url;
    },
    staleTime: 30 * 60 * 1000,
  });

  const status = photo.feedback?.status as PhotoFeedbackStatus | undefined;

  const getStatusChip = () => {
    switch (status) {
      case "favorite":
        return (
          <Chip className="bg-pink-500/10 text-pink-600 border-pink-500/20">
            <Heart className="h-3 w-3 mr-1 fill-current" />
            Favorite
          </Chip>
        );
      case "approved":
        return (
          <Chip className="bg-green-500/10 text-green-600 border-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Chip>
        );
      case "rejected":
        return (
          <Chip className="bg-red-500/10 text-red-600 border-red-500/20">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Chip>
        );
      default:
        return <Chip variant="tertiary">Pending</Chip>;
    }
  };

  return (
    <div className="flex gap-3 p-3 bg-surface-secondary/30 rounded-lg">
      <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-surface-secondary">
        {url && (
          <img
            src={url}
            alt={photo.fileName || "Photo"}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">
            {photo.fileName || "Photo"}
          </p>
          {getStatusChip()}
        </div>
        {photo.feedback?.comment && (
          <p className="text-sm text-muted line-clamp-2">
            "{photo.feedback.comment}"
          </p>
        )}
      </div>
    </div>
  );
}

function GalleryManagementPage() {
  const { galleryId } = Route.useParams();
  const { data: gallery, isLoading } = useGallery(galleryId);
  const deletePhoto = useDeletePhoto();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("photos");
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </Page>
    );
  }

  if (!gallery) {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <ImageOff className="h-16 w-16 text-muted mb-4" />
          <h1 className="text-2xl font-bold mb-2">Gallery Not Found</h1>
          <p className="text-muted mb-4">
            This gallery may have been deleted or you don't have access to it.
          </p>
          <ButtonLink
            to="/dashboard/galleries"
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Galleries
          </ButtonLink>
        </div>
      </Page>
    );
  }

  const sharePath = `/gallery/${gallery.shareToken}`;

  const copyShareLink = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }
    await navigator.clipboard.writeText(
      `${window.location.origin}${sharePath}`,
    );
    toast.success("Link copied to clipboard!");
  };

  const handleDeletePhoto = async (photoId: string) => {
    await deletePhoto.mutateAsync(photoId);
  };

  // Calculate stats
  const stats = {
    total: gallery.photos.length,
    pending: 0,
    favorite: 0,
    approved: 0,
    rejected: 0,
  };

  for (const photo of gallery.photos) {
    const status = (photo.feedback?.status || "pending") as keyof typeof stats;
    if (status in stats) {
      stats[status]++;
    }
  }

  // Filter photos with feedback
  const photosWithFeedback = gallery.photos.filter(
    (p) => p.feedback && p.feedback.status !== "pending",
  );

  return (
    <Page>
      <div className="space-y-6">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", to: "/dashboard", icon: Home },
            { label: "Galleries", to: "/dashboard/galleries", icon: Images },
            { label: gallery.name },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{gallery.name}</h1>
            {gallery.clientName && (
              <p className="text-muted">
                Client: {gallery.clientName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onPress={copyShareLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <a href={sharePath} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview
              </Button>
            </a>
            <Button
              variant="outline"
              isIconOnly
              onPress={() => setSettingsModalOpen(true)}
              aria-label="Open gallery settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <Card.Content className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted">Total Photos</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-4 text-center">
              <p className="text-2xl font-bold text-muted">
                {stats.pending}
              </p>
              <p className="text-xs text-muted">Pending</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-4 text-center">
              <p className="text-2xl font-bold text-pink-500">
                {stats.favorite}
              </p>
              <p className="text-xs text-muted">Favorites</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {stats.approved}
              </p>
              <p className="text-xs text-muted">Approved</p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-4 text-center">
              <p className="text-2xl font-bold text-red-500">
                {stats.rejected}
              </p>
              <p className="text-xs text-muted">Rejected</p>
            </Card.Content>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Gallery sections">
              <Tabs.Tab id="photos">
                Photos
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="feedback">
                {`Feedback (${photosWithFeedback.length})`}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="photos">
            <div className="space-y-6 pt-4">
              {/* Upload area */}
              <PhotoUploader
                galleryId={galleryId}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["gallery", galleryId],
                  });
                }}
              />

              {/* Photo grid */}
              {gallery.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {gallery.photos.map((photo) => (
                    <PhotoThumbnail
                      key={photo.id}
                      photo={photo}
                      onDelete={() => handleDeletePhoto(photo.id)}
                      isDeleting={deletePhoto.isPending}
                    />
                  ))}
                </div>
              ) : (
                <Panel className="p-8 text-center">
                  <Images className="h-12 w-12 mx-auto text-muted mb-3" />
                  <p className="text-muted">
                    No photos yet. Upload photos to get started.
                  </p>
                </Panel>
              )}
            </div>
          </Tabs.Panel>
          <Tabs.Panel id="feedback">
            <div className="space-y-4 pt-4">
              {photosWithFeedback.length > 0 ? (
                <div className="space-y-2">
                  {photosWithFeedback.map((photo) => (
                    <FeedbackItem key={photo.id} photo={photo} />
                  ))}
                </div>
              ) : (
                <Panel className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted mb-3" />
                  <p className="text-muted">
                    No feedback yet. Share the gallery link with your client to
                    get their input.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onPress={copyShareLink}
                  >
                    <Share2 className="h-4 w-4" />
                    Copy Share Link
                  </Button>
                </Panel>
              )}
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>

      <SettingsModal
        gallery={gallery}
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </Page>
  );
}
