/**
 * Friends Routes
 * Friend requests, friendships, notifications, and activity
 */

import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types';
import { requireAuth } from '../middleware/auth';
import * as friendsService from '../services/friends.service';

const friends = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
friends.use('*', requireAuth);

// ============================================================================
// FRIEND REQUESTS
// ============================================================================

/**
 * GET /friends
 * List my friends
 */
friends.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await friendsService.getFriends(c.env.DB, userId, limit, offset);

    return c.json<ApiResponse<{
      friends: friendsService.FriendRecord[];
      total: number;
    }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List friends error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list friends' }, 500);
  }
});

/**
 * GET /friends/requests
 * Get pending friend requests (incoming)
 */
friends.get('/requests', async (c) => {
  try {
    const userId = c.get('userId');
    const requests = await friendsService.getPendingRequests(c.env.DB, userId);

    return c.json<ApiResponse<{ requests: friendsService.FriendRequestWithUser[] }>>({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get requests' }, 500);
  }
});

/**
 * GET /friends/requests/sent
 * Get sent friend requests (outgoing)
 */
friends.get('/requests/sent', async (c) => {
  try {
    const userId = c.get('userId');
    const requests = await friendsService.getSentRequests(c.env.DB, userId);

    return c.json<ApiResponse<{ requests: friendsService.FriendRequestWithUser[] }>>({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get requests' }, 500);
  }
});

/**
 * POST /friends/request/:userId
 * Send a friend request
 */
friends.post('/request/:userId', async (c) => {
  try {
    const fromUserId = c.get('userId');
    const toUserId = c.req.param('userId');
    const body = await c.req.json<{ message?: string }>().catch(() => ({}));

    if (fromUserId === toUserId) {
      return c.json<ApiResponse>({ success: false, error: 'Cannot send friend request to yourself' }, 400);
    }

    const request = await friendsService.sendFriendRequest(
      c.env.DB,
      fromUserId,
      toUserId,
      body.message
    );

    return c.json<ApiResponse<{ request: friendsService.FriendRequestRecord }>>({
      success: true,
      data: { request },
      message: 'Friend request sent',
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send request';
    console.error('Send friend request error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * POST /friends/accept/:requestId
 * Accept a friend request
 */
friends.post('/accept/:requestId', async (c) => {
  try {
    const userId = c.get('userId');
    const requestId = c.req.param('requestId');

    const accepted = await friendsService.acceptFriendRequest(c.env.DB, requestId, userId);

    if (!accepted) {
      return c.json<ApiResponse>({ success: false, error: 'Request not found' }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      message: 'Friend request accepted',
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to accept request' }, 500);
  }
});

/**
 * POST /friends/decline/:requestId
 * Decline a friend request
 */
friends.post('/decline/:requestId', async (c) => {
  try {
    const userId = c.get('userId');
    const requestId = c.req.param('requestId');

    const declined = await friendsService.declineFriendRequest(c.env.DB, requestId, userId);

    if (!declined) {
      return c.json<ApiResponse>({ success: false, error: 'Request not found' }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      message: 'Friend request declined',
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to decline request' }, 500);
  }
});

/**
 * DELETE /friends/:userId
 * Remove a friend
 */
friends.delete('/:userId', async (c) => {
  try {
    const userId = c.get('userId');
    const friendId = c.req.param('userId');

    const removed = await friendsService.removeFriend(c.env.DB, userId, friendId);

    if (!removed) {
      return c.json<ApiResponse>({ success: false, error: 'Not friends' }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      message: 'Friend removed',
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to remove friend' }, 500);
  }
});

/**
 * GET /friends/check/:userId
 * Check friendship status with a user
 */
friends.get('/check/:userId', async (c) => {
  try {
    const userId = c.get('userId');
    const targetUserId = c.req.param('userId');

    const areFriends = await friendsService.areFriends(c.env.DB, userId, targetUserId);

    return c.json<ApiResponse<{ areFriends: boolean }>>({
      success: true,
      data: { areFriends },
    });
  } catch (error) {
    console.error('Check friendship error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to check friendship' }, 500);
  }
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * GET /friends/notifications
 * Get notifications
 */
friends.get('/notifications', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const unreadOnly = query.unread === 'true';

    const notifications = await friendsService.getNotifications(c.env.DB, userId, limit, unreadOnly);
    const unreadCount = await friendsService.getUnreadCount(c.env.DB, userId);

    return c.json<ApiResponse<{
      notifications: friendsService.NotificationRecord[];
      unreadCount: number;
    }>>({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get notifications' }, 500);
  }
});

/**
 * POST /friends/notifications/:id/read
 * Mark notification as read
 */
friends.post('/notifications/:id/read', async (c) => {
  try {
    const userId = c.get('userId');
    const notificationId = c.req.param('id');

    const marked = await friendsService.markNotificationRead(c.env.DB, notificationId, userId);

    return c.json<ApiResponse<{ marked: boolean }>>({
      success: true,
      data: { marked },
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to mark as read' }, 500);
  }
});

/**
 * POST /friends/notifications/read-all
 * Mark all notifications as read
 */
friends.post('/notifications/read-all', async (c) => {
  try {
    const userId = c.get('userId');
    const count = await friendsService.markAllNotificationsRead(c.env.DB, userId);

    return c.json<ApiResponse<{ count: number }>>({
      success: true,
      data: { count },
      message: `Marked ${count} notifications as read`,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to mark as read' }, 500);
  }
});

// ============================================================================
// ACTIVITY
// ============================================================================

/**
 * GET /friends/activity
 * Get activity feed (friends' activity)
 */
friends.get('/activity', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 50;

    const activity = await friendsService.getFriendsActivity(c.env.DB, userId, limit);

    return c.json<ApiResponse<{ activity: typeof activity }>>({
      success: true,
      data: { activity },
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get activity' }, 500);
  }
});

/**
 * GET /friends/activity/me
 * Get my activity
 */
friends.get('/activity/me', async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const activity = await friendsService.getUserActivity(c.env.DB, userId, limit);

    return c.json<ApiResponse<{ activity: friendsService.ActivityRecord[] }>>({
      success: true,
      data: { activity },
    });
  } catch (error) {
    console.error('Get my activity error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get activity' }, 500);
  }
});

export default friends;
