import { AuthenticatedRequest, HttpResponse } from "../../httpd/lib";
import { MultichainClient } from "../../multichain";
import * as Notification from "../model/Notification";

export const getNotificationCount = async (
  multichain: MultichainClient,
  req: AuthenticatedRequest,
): Promise<HttpResponse> => {
  const rawNotifications = await Notification.get(multichain, req.user);
  const notificationCount = rawNotifications.reduce((acc, notification) => {
    if (notification.isRead === false) {
      acc = acc + 1;
    }
    return acc;
  }, 0);
  return [
    200,
    {
      apiVersion: "1.0",
      data: {
        notificationCount,
      },
    },
  ];
};
