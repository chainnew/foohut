/**
 * Chat Routes
 * IRC-style chat with channels, DMs, and messages
 */

import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types';
import { requireAuth } from '../middleware/auth';
import * as chatService from '../services/chat.service';

const chat = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
chat.use('*', requireAuth);

// ============================================================================
// CHANNEL ROUTES
// ============================================================================

/**
 * GET /chat/channels
 * List available public channels
 */
chat.get('/channels', async (c) => {
  try {
    const query = c.req.query();
    const type = query.type as 'public' | 'private' | 'org' | undefined;
    const orgId = query.orgId;

    const channels = await chatService.listChannels(c.env.DB, type, orgId);

    return c.json<ApiResponse<{ channels: chatService.ChannelRecord[] }>>({
      success: true,
      data: { channels },
    });
  } catch (error) {
    console.error('List channels error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list channels' }, 500);
  }
});

/**
 * GET /chat/channels/joined
 * List channels the user has joined
 */
chat.get('/channels/joined', async (c) => {
  try {
    const userId = c.get('userId');
    const channels = await chatService.getUserChannels(c.env.DB, userId);

    return c.json<ApiResponse<{ channels: chatService.ChannelRecord[] }>>({
      success: true,
      data: { channels },
    });
  } catch (error) {
    console.error('List joined channels error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list channels' }, 500);
  }
});

/**
 * POST /chat/channels
 * Create a new channel
 */
chat.post('/channels', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json<{
      name: string;
      slug: string;
      description?: string;
      type?: 'public' | 'private' | 'org';
      orgId?: string;
    }>();

    if (!body.name?.trim() || !body.slug?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Name and slug are required' }, 400);
    }

    // Check if slug is taken
    const existing = await chatService.getChannelBySlug(c.env.DB, body.slug);
    if (existing) {
      return c.json<ApiResponse>({ success: false, error: 'Channel slug already exists' }, 409);
    }

    const channel = await chatService.createChannel(c.env.DB, userId, body);

    return c.json<ApiResponse<{ channel: chatService.ChannelRecord }>>({
      success: true,
      data: { channel },
      message: 'Channel created successfully',
    }, 201);
  } catch (error) {
    console.error('Create channel error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create channel' }, 500);
  }
});

/**
 * GET /chat/channels/:id
 * Get channel details
 */
chat.get('/channels/:id', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');

    const channel = await chatService.getChannel(c.env.DB, channelId);
    if (!channel) {
      return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
    }

    // Check access for private channels
    if (channel.type === 'private') {
      const isMember = await chatService.isChannelMember(c.env.DB, channelId, userId);
      if (!isMember) {
        return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
      }
    }

    const isMember = await chatService.isChannelMember(c.env.DB, channelId, userId);

    return c.json<ApiResponse<{ channel: chatService.ChannelRecord; isMember: boolean }>>({
      success: true,
      data: { channel, isMember },
    });
  } catch (error) {
    console.error('Get channel error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get channel' }, 500);
  }
});

/**
 * POST /chat/channels/:id/join
 * Join a channel
 */
chat.post('/channels/:id/join', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');

    const channel = await chatService.getChannel(c.env.DB, channelId);
    if (!channel) {
      return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
    }

    // Can't join private channels without invite
    if (channel.type === 'private') {
      return c.json<ApiResponse>({ success: false, error: 'This channel is invite-only' }, 403);
    }

    const joined = await chatService.joinChannel(c.env.DB, channelId, userId);

    return c.json<ApiResponse<{ joined: boolean }>>({
      success: true,
      data: { joined },
      message: joined ? 'Joined channel' : 'Already a member',
    });
  } catch (error) {
    console.error('Join channel error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to join channel' }, 500);
  }
});

/**
 * POST /chat/channels/:id/leave
 * Leave a channel
 */
chat.post('/channels/:id/leave', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');

    const left = await chatService.leaveChannel(c.env.DB, channelId, userId);

    return c.json<ApiResponse<{ left: boolean }>>({
      success: true,
      data: { left },
      message: left ? 'Left channel' : 'Not a member',
    });
  } catch (error) {
    console.error('Leave channel error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to leave channel' }, 500);
  }
});

/**
 * GET /chat/channels/:id/members
 * List channel members
 */
chat.get('/channels/:id/members', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');
    const query = c.req.query();

    const channel = await chatService.getChannel(c.env.DB, channelId);
    if (!channel) {
      return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
    }

    // Check access for private channels
    if (channel.type === 'private') {
      const isMember = await chatService.isChannelMember(c.env.DB, channelId, userId);
      if (!isMember) {
        return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
      }
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const members = await chatService.getChannelMembers(c.env.DB, channelId, limit, offset);

    return c.json<ApiResponse<{ members: typeof members }>>({
      success: true,
      data: { members },
    });
  } catch (error) {
    console.error('Get channel members error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get members' }, 500);
  }
});

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

/**
 * GET /chat/channels/:id/messages
 * Get messages in a channel
 */
chat.get('/channels/:id/messages', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');
    const query = c.req.query();

    const channel = await chatService.getChannel(c.env.DB, channelId);
    if (!channel) {
      return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
    }

    // Check access for private channels
    if (channel.type === 'private') {
      const isMember = await chatService.isChannelMember(c.env.DB, channelId, userId);
      if (!isMember) {
        return c.json<ApiResponse>({ success: false, error: 'Channel not found' }, 404);
      }
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const before = query.before ? parseInt(query.before, 10) : undefined;

    const messages = await chatService.getMessages(c.env.DB, channelId, limit, before);

    return c.json<ApiResponse<{ messages: chatService.MessageWithUser[] }>>({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get messages' }, 500);
  }
});

/**
 * POST /chat/channels/:id/messages
 * Send a message to a channel
 */
chat.post('/channels/:id/messages', async (c) => {
  try {
    const channelId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json<{
      content: string;
      type?: 'text' | 'action';
      replyTo?: string;
    }>();

    if (!body.content?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Message content is required' }, 400);
    }

    // Check if user is a member
    const isMember = await chatService.isChannelMember(c.env.DB, channelId, userId);
    if (!isMember) {
      // Auto-join public channels
      const channel = await chatService.getChannel(c.env.DB, channelId);
      if (!channel || channel.type !== 'public') {
        return c.json<ApiResponse>({ success: false, error: 'You must join this channel first' }, 403);
      }
      await chatService.joinChannel(c.env.DB, channelId, userId);
    }

    const message = await chatService.sendMessage(
      c.env.DB,
      channelId,
      userId,
      body.content,
      body.type || 'text',
      body.replyTo
    );

    return c.json<ApiResponse<{ message: chatService.MessageRecord }>>({
      success: true,
      data: { message },
    }, 201);
  } catch (error) {
    console.error('Send message error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to send message' }, 500);
  }
});

/**
 * PATCH /chat/messages/:id
 * Edit a message
 */
chat.patch('/messages/:id', async (c) => {
  try {
    const messageId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json<{ content: string }>();

    if (!body.content?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Message content is required' }, 400);
    }

    const message = await chatService.editMessage(c.env.DB, messageId, userId, body.content);

    if (!message) {
      return c.json<ApiResponse>({ success: false, error: 'Message not found or not yours' }, 404);
    }

    return c.json<ApiResponse<{ message: chatService.MessageRecord }>>({
      success: true,
      data: { message },
    });
  } catch (error) {
    console.error('Edit message error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to edit message' }, 500);
  }
});

/**
 * DELETE /chat/messages/:id
 * Delete a message
 */
chat.delete('/messages/:id', async (c) => {
  try {
    const messageId = c.req.param('id');
    const userId = c.get('userId');

    const deleted = await chatService.deleteMessage(c.env.DB, messageId, userId);

    if (!deleted) {
      return c.json<ApiResponse>({ success: false, error: 'Message not found or not yours' }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to delete message' }, 500);
  }
});

/**
 * POST /chat/messages/:id/react
 * Add a reaction to a message
 */
chat.post('/messages/:id/react', async (c) => {
  try {
    const messageId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json<{ emoji: string }>();

    if (!body.emoji) {
      return c.json<ApiResponse>({ success: false, error: 'Emoji is required' }, 400);
    }

    const added = await chatService.addReaction(c.env.DB, messageId, userId, body.emoji);

    return c.json<ApiResponse<{ added: boolean }>>({
      success: true,
      data: { added },
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to add reaction' }, 500);
  }
});

/**
 * DELETE /chat/messages/:id/react/:emoji
 * Remove a reaction from a message
 */
chat.delete('/messages/:id/react/:emoji', async (c) => {
  try {
    const messageId = c.req.param('id');
    const emoji = decodeURIComponent(c.req.param('emoji'));
    const userId = c.get('userId');

    const removed = await chatService.removeReaction(c.env.DB, messageId, userId, emoji);

    return c.json<ApiResponse<{ removed: boolean }>>({
      success: true,
      data: { removed },
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to remove reaction' }, 500);
  }
});

// ============================================================================
// DM ROUTES
// ============================================================================

/**
 * GET /chat/dms
 * List DM conversations
 */
chat.get('/dms', async (c) => {
  try {
    const userId = c.get('userId');
    const conversations = await chatService.getUserDMConversations(c.env.DB, userId);

    return c.json<ApiResponse<{ conversations: typeof conversations }>>({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    console.error('List DMs error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list DMs' }, 500);
  }
});

/**
 * POST /chat/dms
 * Start or get existing DM conversation
 */
chat.post('/dms', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json<{ userId: string }>();

    if (!body.userId) {
      return c.json<ApiResponse>({ success: false, error: 'User ID is required' }, 400);
    }

    if (body.userId === userId) {
      return c.json<ApiResponse>({ success: false, error: 'Cannot DM yourself' }, 400);
    }

    const conversation = await chatService.getOrCreateDMConversation(c.env.DB, userId, body.userId);

    return c.json<ApiResponse<{ conversation: chatService.DMConversationRecord }>>({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    console.error('Start DM error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to start DM' }, 500);
  }
});

/**
 * GET /chat/dms/:id/messages
 * Get DM messages
 */
chat.get('/dms/:id/messages', async (c) => {
  try {
    const conversationId = c.req.param('id');
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const before = query.before ? parseInt(query.before, 10) : undefined;

    const messages = await chatService.getDMMessages(c.env.DB, conversationId, limit, before);

    return c.json<ApiResponse<{ messages: chatService.DMMessageRecord[] }>>({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error('Get DM messages error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get messages' }, 500);
  }
});

/**
 * POST /chat/dms/:id/messages
 * Send a DM
 */
chat.post('/dms/:id/messages', async (c) => {
  try {
    const conversationId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json<{ content: string }>();

    if (!body.content?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Message content is required' }, 400);
    }

    const message = await chatService.sendDMMessage(c.env.DB, conversationId, userId, body.content);

    return c.json<ApiResponse<{ message: chatService.DMMessageRecord }>>({
      success: true,
      data: { message },
    }, 201);
  } catch (error) {
    console.error('Send DM error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to send message' }, 500);
  }
});

export default chat;
