import {
    createOrganizationNotification,
    getOrganizationNotifications,
} from '../utils/helperFunctions.js';

export async function createNotification(userId, content, eventDate) {
    if (!content) {
        throw new Error('Notification content is required');
    }

    if (!eventDate) {
        throw new Error('Event date is required');
    }

    const dateObj = new Date(eventDate);
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid event date format');
    }
    const validDate = String(eventDate).split('T')[0];

    const newId = await createOrganizationNotification(userId, content, validDate);

    return {
        id: newId,
        content,
        eventDate: validDate,
    };
}

export async function getAllNotifications(userId, userRole, adminId = null) {
    let adminUserId = userId;

    if (userRole === 'student') {
        adminUserId = adminId;
    }

    if (!adminUserId) {
        throw new Error('User ID or Admin ID not found');
    }

    const notifications = await getOrganizationNotifications(adminUserId);

    return notifications;
}
