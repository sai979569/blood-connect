import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { NOTIFICATION_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';
import { getIO } from '../socket/socketHandler.js';

/**
 * Creates, persists, and delivers an in-app notification to a user.
 * Implements deduplication to prevent duplicate alerts for the same request and recipient,
 * lifecycle status tracking (queued -> sent / delivered / failed -> read),
 * and safe delivery via Socket.IO.
 */
export const createAndSendNotification = async ({
  userId,
  title,
  message,
  type,
  relatedRequestId = null,
  metadata = {},
}) => {
  try {
    if (!userId || !title || !message) {
      console.warn('[NotificationService] Missing required fields for notification');
      return null;
    }

    // 1. Prevent duplicate notifications for the same request and recipient
    if (relatedRequestId) {
      const query = {
        userId,
        relatedRequestId,
        type,
      };

      // For radius expansions, deduplicate by the specific target radius
      if (type === NOTIFICATION_TYPES.RADIUS_EXPANDED && metadata.newRadius) {
        query['metadata.newRadius'] = metadata.newRadius;
      }

      const existingNotification = await Notification.findOne(query);
      if (existingNotification) {
        // Return existing notification to prevent duplicate spam
        return existingNotification;
      }
    }

    // 2. Persist notification record in MongoDB with initial QUEUED status
    const notification = await Notification.create({
      userId,
      title: title.trim(),
      message: message.trim(),
      type,
      relatedRequestId,
      metadata,
      status: NOTIFICATION_STATUS.QUEUED,
    });

    // 3. Real-time delivery via Socket.IO
    const io = getIO();
    if (io) {
      try {
        const userRoom = `user:${userId.toString()}`;
        const roomMembers = io.sockets?.adapter?.rooms?.get(userRoom);
        const isClientConnected = roomMembers && roomMembers.size > 0;

        io.to(userRoom).emit('notification:new', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedRequestId: notification.relatedRequestId,
          metadata: notification.metadata,
          status: isClientConnected ? NOTIFICATION_STATUS.DELIVERED : NOTIFICATION_STATUS.SENT,
          createdAt: notification.createdAt,
        });

        notification.status = isClientConnected
          ? NOTIFICATION_STATUS.DELIVERED
          : NOTIFICATION_STATUS.SENT;
        await notification.save();
      } catch (socketErr) {
        console.error(`[NotificationService] Socket delivery error for user ${userId}:`, socketErr.message);
        notification.status = NOTIFICATION_STATUS.FAILED;
        await notification.save();
      }
    }

    return notification;
  } catch (error) {
    console.error(`[NotificationService] Error in createAndSendNotification:`, error.message);
    return null;
  }
};

/**
 * Marks notification as read
 */
export const markNotificationRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date(), status: NOTIFICATION_STATUS.READ },
    { new: true }
  );
};

export default { createAndSendNotification, markNotificationRead };
