import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  Images,
  Plus,
  Share2,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Page } from "~/components/Page";
import { PageTitle } from "~/components/PageTitle";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { EmptyState } from "~/components/EmptyState";
import {
  Button,
  Chip,
  Modal,
  Input,
  TextArea,
  Switch,
  Dropdown,
} from "@heroui/react";
import { Panel } from "~/components/ui/panel";
import { toast } from "@heroui/react";
import { ButtonLink, Link } from "~/components/ui/link";
import { formatRelativeTime } from "~/utils/song";
import { cn } from "~/lib/utils";
import {
  useStudioGalleries,
  useCreateGallery,
  useDeleteGallery,
  useUpdateGallery,
} from "~/hooks/useGalleries";
import { studioGalleriesQueryOptions } from "~/queries/galleries";
import type { GalleryWithStudio } from "~/data-access/galleries";

export const Route = createFileRoute("/dashboard/galleries/")({
  loader: async ({ context }) => {
    const { queryClient } = context;
    await queryClient.ensureQueryData(studioGalleriesQueryOptions());
  },
  component: GalleriesPage,
});

function CreateGalleryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const createGallery = useCreateGallery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createGallery.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      clientName: clientName.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      allowDownload,
    });

    onClose();
    setName("");
    setDescription("");
    setClientName("");
    setClientEmail("");
    setAllowDownload(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <span className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger className="opacity-100 text-foreground/80 hover:text-foreground bg-default/80 hover:bg-default border border-border/60 shadow-sm" />
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>Create New Gallery</Modal.Heading>
                <p className="text-sm text-muted">
                  Share photos with clients and collect their selections.
                </p>
              </Modal.Header>
              <Modal.Body className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="gallery-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Gallery Name
                  </label>
                  <Input
                    id="gallery-name"
                    placeholder="e.g., Smith Wedding Photos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="gallery-description"
                    className="text-sm font-medium text-foreground"
                  >
                    Description (optional)
                  </label>
                  <TextArea
                    id="gallery-description"
                    placeholder="Add notes about this gallery..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="gallery-client-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Client Name (optional)
                  </label>
                  <Input
                    id="gallery-client-name"
                    placeholder="e.g., John & Jane Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    fullWidth
                    variant="secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="gallery-client-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Client Email (optional)
                  </label>
                  <Input
                    id="gallery-client-email"
                    placeholder="client@example.com"
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
                      htmlFor="allowDownload"
                      className="text-sm font-medium text-foreground"
                    >
                      Allow client to download photos
                    </label>
                    <p className="text-xs text-muted">
                      Clients can download original files from the gallery.
                    </p>
                  </div>
                  <Switch
                    id="allowDownload"
                    isSelected={allowDownload}
                    onChange={setAllowDownload}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-end gap-3">
                <Button variant="outline" slot="close">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isDisabled={!name.trim()}
                  isPending={createGallery.isPending}
                >
                  {createGallery.isPending ? "Creating..." : "Create Gallery"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DeleteGalleryModal({
  gallery,
  isOpen,
  onClose,
}: {
  gallery: GalleryWithStudio | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const deleteGallery = useDeleteGallery();

  const handleDelete = async () => {
    if (!gallery) return;
    await deleteGallery.mutateAsync(gallery.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <span className="hidden" />
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger className="opacity-100 text-foreground/80 hover:text-foreground bg-default/80 hover:bg-default border border-border/60 shadow-sm" />
            <Modal.Header>
              <Modal.Heading>Delete Gallery</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p>
                Are you sure you want to delete <strong>{gallery?.name}</strong>
                ?
              </p>
              <p className="text-sm text-muted mt-2">
                This will permanently delete all photos and feedback in this
                gallery. This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline" slot="close">
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={handleDelete}
                isDisabled={deleteGallery.isPending}
              >
                {deleteGallery.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Delete Gallery
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function GalleryCard({ gallery }: { gallery: GalleryWithStudio }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const updateGallery = useUpdateGallery();
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

  const toggleActive = async () => {
    await updateGallery.mutateAsync({
      id: gallery.id,
      isActive: !gallery.isActive,
    });
  };

  return (
    <>
      <Panel className="overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300 group">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <Link
                to="/dashboard/galleries/$galleryId"
                params={{ galleryId: gallery.id }}
                search={{ tab: undefined }}
                className="block"
              >
                <h3 className="font-semibold text-base leading-tight hover:text-accent transition-colors truncate">
                  {gallery.name}
                </h3>
              </Link>
              {gallery.clientName && (
                <p className="text-sm text-muted mt-0.5">
                  Client: {gallery.clientName}
                </p>
              )}
            </div>
            <Dropdown>
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                aria-label={`Open actions for ${gallery.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label={`Actions for ${gallery.name}`}
                  onAction={(key) => {
                    const action = String(key);
                    if (action === "copy") {
                      void copyShareLink();
                      return;
                    }

                    if (action === "toggle") {
                      void toggleActive();
                      return;
                    }

                    if (action === "delete") {
                      setDeleteModalOpen(true);
                    }
                  }}
                >
                  <Dropdown.Item id="copy" textValue="Copy share link">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copy Share Link
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="toggle"
                    textValue={gallery.isActive ? "Deactivate" : "Activate"}
                  >
                    <div className="flex items-center gap-2">
                      {gallery.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {gallery.isActive ? "Deactivate" : "Activate"}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="delete"
                    textValue="Delete"
                    variant="danger"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>

          {gallery.description && (
            <p className="text-sm text-muted line-clamp-2 mb-3">
              {gallery.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Chip
              variant="tertiary"
              className={cn(
                "text-xs",
                gallery.isActive
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-surface-secondary text-muted",
              )}
            >
              {gallery.isActive ? "Active" : "Inactive"}
            </Chip>
            {gallery.allowDownload && (
              <Chip variant="tertiary" className="text-xs">
                Downloads enabled
              </Chip>
            )}
          </div>

          <p className="text-xs text-muted">
            Created{" "}
            {formatRelativeTime(new Date(gallery.createdAt).toISOString())}
          </p>
        </div>

        <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between bg-surface-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onPress={copyShareLink}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <ButtonLink
            to="/dashboard/galleries/$galleryId"
            params={{ galleryId: gallery.id }}
            search={{ tab: undefined }}
            variant="outline"
            size="sm"
          >
            Manage
          </ButtonLink>
        </div>
      </Panel>

      <DeleteGalleryModal
        gallery={gallery}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </>
  );
}

function GalleryListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Panel key={i} className="overflow-hidden">
          <div className="p-5 space-y-3">
            <div className="h-5 bg-surface-secondary/50 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-surface-secondary/50 rounded w-1/2 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 bg-surface-secondary/50 rounded w-16 animate-pulse" />
            </div>
          </div>
          <div className="border-t border-border/50 px-5 py-3 flex justify-between">
            <div className="h-8 bg-surface-secondary/50 rounded w-20 animate-pulse" />
            <div className="h-8 bg-surface-secondary/50 rounded w-20 animate-pulse" />
          </div>
        </Panel>
      ))}
    </div>
  );
}

function GalleriesPage() {
  const { data: galleries, isLoading } = useStudioGalleries();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <Page>
      <div className="space-y-8">
        <AppBreadcrumb
          items={[
            { label: "Dashboard", to: "/dashboard", icon: Home },
            { label: "Galleries", icon: Images },
          ]}
        />

        <div className="flex items-center justify-between">
          <PageTitle
            title="Client Galleries"
            description="Share photos with clients for selection and feedback"
          />
          <Button onPress={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Gallery
          </Button>
        </div>

        {isLoading ? (
          <GalleryListSkeleton count={4} />
        ) : galleries && galleries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Images className="h-10 w-10 text-accent/60" />}
            title="No galleries yet"
            description="Create your first gallery to start sharing photos with clients for review and approval."
            actionLabel="Create Gallery"
            onAction={() => setCreateModalOpen(true)}
          />
        )}
      </div>

      <CreateGalleryModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </Page>
  );
}
