
import * as notificationService from '../services/notificationService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createNotification = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role || 'admin';

  if (userRole !== 'admin') {
    throw ApiError.forbidden('Only administrators can create notifications');
  }

  const { content, event_date } = req.body;

  try {
    const notification = await notificationService.createNotification(
      userId,
      content,
      event_date
    );

    res.status(201).json(
      ApiResponse.success(
        {
          id: notification.id,
          content: notification.content,
        },
        'Notification created successfully'
      )
    );
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      throw ApiError.badRequest(error.message);
    }
    throw error;
  }
});

export const getAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const adminId = req.user?.adminId;

  try {
    const notifications = await notificationService.getAllNotifications(
      userId,
      userRole,
      adminId
    );

    res.json(
      ApiResponse.success(
        notifications,
        'Notifications fetched successfully',
        200
      )
    );
  } catch (error) {
    if (error.message.includes('not found')) {
      throw ApiError.unauthorized(error.message);
    }
    throw error;
  }
});
