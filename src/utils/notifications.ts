import type { NotificationWithUser } from "~/data-access/notifications";

type NotificationRoute = Pick<
  NotificationWithUser,
  "relatedId" | "relatedType"
>;

export function getNotificationHref(
  notification: NotificationRoute,
): string | null {
  if (!notification.relatedId) {
    return null;
  }

  switch (notification.relatedType) {
    case "post":
      return `/dashboard/community/post/${notification.relatedId}`;
    case "gallery":
      return `/dashboard/galleries/${notification.relatedId}?tab=feedback`;
    default:
      return null;
  }
}
