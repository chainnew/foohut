import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types/index';
import { requireAuth, requireAdmin } from '../middleware/auth';

interface AdminMetricRow {
  id: string;
  category: string;
  label: string;
  value: string;
  delta: string | null;
  tone: string | null;
  detail: string | null;
  meta: string | null;
  updated_at: string;
}

interface AdminItemRow {
  id: string;
  category: string;
  title: string;
  status: string | null;
  severity: string | null;
  detail: string | null;
  meta: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminUserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  plan: string;
  status: string;
  location: string | null;
  phone: string | null;
  email_verified: number;
  created_at: string;
}

interface AdminSupportTicketRow {
  id: string;
  subject: string;
  requester_handle: string | null;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
}

interface AdminAnnouncementRow {
  id: string;
  title: string;
  audience: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface AdminApiKeyRow {
  id: string;
  api_key: string;
  owner: string;
  scope: string;
  last_used_at: string | null;
  created_at: string;
}

interface AdminFlagRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: number;
  updated_at: string;
}

interface AdminMaintenanceRow {
  id: string;
  region: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

interface AdminOperationalLockRow {
  id: string;
  key: string;
  label: string;
  status: string;
  updated_at: string;
}

interface AdminStaffMemberRow {
  id: string;
  email: string;
  role_title: string | null;
  group_label: string;
  status: string;
}

interface AdminRolePermissionRow {
  id: string;
  permission: string;
  super: string;
  platform: string;
  ops: string;
  security: string;
  moderator: string;
  support: string;
}

interface AdminPresenceRow {
  id: string;
  name: string;
  status: string;
  type: string;
  updated_at: string;
}

interface AdminShiftRow {
  id: string;
  label: string;
  time_range: string;
}

const admin = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

admin.use('*', requireAuth, requireAdmin);

function parseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(meta) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function mapMetric(row: AdminMetricRow) {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    value: row.value,
    delta: row.delta ?? undefined,
    tone: row.tone ?? undefined,
    detail: row.detail ?? undefined,
    meta: parseMeta(row.meta),
    updatedAt: row.updated_at,
  };
}

function mapItem(row: AdminItemRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    status: row.status ?? undefined,
    severity: row.severity ?? undefined,
    detail: row.detail ?? undefined,
    meta: parseMeta(row.meta),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listMetrics(db: D1Database, category: string) {
  const results = await db
    .prepare('SELECT * FROM admin_metrics WHERE category = ? ORDER BY label ASC')
    .bind(category)
    .all<AdminMetricRow>();
  return (results.results || []).map(mapMetric);
}

async function listItems(db: D1Database, category: string) {
  const results = await db
    .prepare('SELECT * FROM admin_items WHERE category = ? ORDER BY updated_at DESC')
    .bind(category)
    .all<AdminItemRow>();
  return (results.results || []).map(mapItem);
}

async function logAdminActivity(db: D1Database, title: string, detail?: string, icon?: string) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO admin_items (id, category, title, status, severity, detail, meta, created_at, updated_at)
     VALUES (?, 'activity', ?, NULL, NULL, ?, ?, ?, ?)`
  )
    .bind(id, title, detail || null, JSON.stringify({ icon: icon || 'Activity' }), now, now)
    .run();
}

// ============================================================================
// Dashboard
// ============================================================================

admin.get('/admin/dashboard', async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'
    ).first<{ count: number }>();

    const openTickets = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM admin_support_tickets WHERE status != 'Solved'"
    ).first<{ count: number }>();

    const activeAlerts = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM admin_items WHERE category = 'security_alerts' AND (status IS NULL OR status != 'Resolved')"
    ).first<{ count: number }>();

    const dashboardMetrics = await listMetrics(c.env.DB, 'dashboard');
    const metricMap = new Map(dashboardMetrics.map((metric) => [metric.label, metric]));

    const stats = [
      {
        label: 'Total Users',
        value: formatNumber(totalUsers?.count ?? 0),
        delta: metricMap.get('Total Users')?.delta,
        tone: 'cyan',
      },
      {
        label: 'Daily Active',
        value: metricMap.get('Daily Active')?.value ?? '0',
        delta: metricMap.get('Daily Active')?.delta,
        tone: 'emerald',
      },
      {
        label: 'Monthly Revenue',
        value: metricMap.get('Monthly Revenue')?.value ?? '$0',
        delta: metricMap.get('Monthly Revenue')?.delta,
        tone: 'amber',
      },
      {
        label: 'Open Tickets',
        value: formatNumber(openTickets?.count ?? 0),
        delta: metricMap.get('Open Tickets')?.delta,
        tone: 'slate',
      },
      {
        label: 'Active Alerts',
        value: formatNumber(activeAlerts?.count ?? 0),
        delta: metricMap.get('Active Alerts')?.delta,
        tone: 'rose',
      },
    ];

    const health = (await listItems(c.env.DB, 'health')).map((item) => ({
      id: item.id,
      label: item.title,
      detail: item.detail ?? '',
      status: item.status ?? 'Unknown',
      tone: item.severity ?? 'neutral',
    }));

    const attention = (await listItems(c.env.DB, 'attention')).map((item) => ({
      id: item.id,
      label: item.title,
      detail: item.detail ?? '',
      tone: item.severity ?? 'neutral',
    }));

    const activity = (await listItems(c.env.DB, 'activity')).map((item) => ({
      id: item.id,
      label: item.title,
      detail: item.detail ?? '',
      icon: (item.meta.icon as string | undefined) ?? 'Activity',
    }));

    const operations = (await listItems(c.env.DB, 'operations')).map((item) => ({
      id: item.id,
      label: item.title,
      detail: item.detail ?? '',
      time: item.updatedAt,
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { stats, health, attention, activity, operations },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load admin dashboard' }, 500);
  }
});

// ============================================================================
// Users
// ============================================================================

admin.get('/admin/users', async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'
    ).first<{ count: number }>();

    const activeUsers = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active' AND deleted_at IS NULL"
    ).first<{ count: number }>();

    const proUsers = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE plan IN ('pro', 'team', 'enterprise') AND deleted_at IS NULL"
    ).first<{ count: number }>();

    const suspendedUsers = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE status = 'suspended' AND deleted_at IS NULL"
    ).first<{ count: number }>();

    const bannedUsers = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE status = 'banned' AND deleted_at IS NULL"
    ).first<{ count: number }>();

    const results = await c.env.DB.prepare(
      `SELECT id, username, display_name, email, plan, status, location, phone, email_verified, created_at
       FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`
    ).all<AdminUserRow>();

    const users = (results.results || []).map((user) => ({
      id: user.id,
      handle: user.username ? `@${user.username}` : user.email,
      name: user.display_name || user.username || user.email,
      email: user.email,
      plan: user.plan,
      status: user.status,
      joined: user.created_at,
      location: user.location || 'Unknown',
      verified: user.email_verified === 1,
      phone: user.phone,
    }));

    const stats = [
      { label: 'Total Users', value: formatNumber(totalUsers?.count ?? 0), tone: 'cyan' },
      { label: 'Active Today', value: formatNumber(activeUsers?.count ?? 0), tone: 'emerald' },
      { label: 'Pro Accounts', value: formatNumber(proUsers?.count ?? 0), tone: 'amber' },
      { label: 'Suspended', value: formatNumber(suspendedUsers?.count ?? 0), tone: 'rose' },
      { label: 'Banned', value: formatNumber(bannedUsers?.count ?? 0), tone: 'slate' },
    ];

    return c.json<ApiResponse>({ success: true, data: { stats, users } });
  } catch (error) {
    console.error('Admin users error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load users' }, 500);
  }
});

admin.patch('/admin/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json<{
      status?: string;
      plan?: string;
      location?: string | null;
      phone?: string | null;
      displayName?: string | null;
    }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.status) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.plan) {
      updates.push('plan = ?');
      values.push(body.plan);
    }
    if (body.location !== undefined) {
      updates.push('location = ?');
      values.push(body.location);
    }
    if (body.phone !== undefined) {
      updates.push('phone = ?');
      values.push(body.phone);
    }
    if (body.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(body.displayName);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(...values)
      .run();

    await logAdminActivity(c.env.DB, 'Updated user profile', `User ${userId}`);

    return c.json<ApiResponse>({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update user' }, 500);
  }
});

admin.post('/admin/users/:userId/actions', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json<{ action: 'warn' | 'suspend' | 'ban' | 'activate' }>();

    const now = new Date().toISOString();
    if (body.action === 'suspend') {
      await c.env.DB.prepare(
        "UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?"
      )
        .bind(now, userId)
        .run();
      await logAdminActivity(c.env.DB, 'Suspended user', `User ${userId}`, 'Shield');
    } else if (body.action === 'ban') {
      await c.env.DB.prepare(
        "UPDATE users SET status = 'banned', updated_at = ? WHERE id = ?"
      )
        .bind(now, userId)
        .run();
      await logAdminActivity(c.env.DB, 'Banned user', `User ${userId}`, 'AlertTriangle');
    } else if (body.action === 'activate') {
      await c.env.DB.prepare(
        "UPDATE users SET status = 'active', updated_at = ? WHERE id = ?"
      )
        .bind(now, userId)
        .run();
      await logAdminActivity(c.env.DB, 'Reactivated user', `User ${userId}`, 'CheckCircle');
    } else {
      await logAdminActivity(c.env.DB, 'Sent user warning', `User ${userId}`, 'MessageSquare');
    }

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('User action error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to apply action' }, 500);
  }
});

// ============================================================================
// Staff
// ============================================================================

admin.get('/admin/staff', async (c) => {
  try {
    const staffResults = await c.env.DB.prepare(
      'SELECT * FROM admin_staff_members ORDER BY group_label ASC, email ASC'
    ).all<AdminStaffMemberRow>();

    const groupsMap = new Map<string, { id: string; label: string; members: Array<{ name: string; role: string; status: string }> }>();
    (staffResults.results || []).forEach((member) => {
      if (!groupsMap.has(member.group_label)) {
        groupsMap.set(member.group_label, {
          id: member.group_label.toLowerCase().replace(/\s+/g, '-'),
          label: member.group_label,
          members: [],
        });
      }
      groupsMap.get(member.group_label)?.members.push({
        name: member.email,
        role: member.role_title || 'Staff',
        status: member.status,
      });
    });

    const permissionsResults = await c.env.DB.prepare(
      'SELECT * FROM admin_role_permissions ORDER BY permission ASC'
    ).all<AdminRolePermissionRow>();

    const moderationRosterResults = await c.env.DB.prepare(
      "SELECT * FROM admin_staff_presence WHERE type = 'moderator' ORDER BY updated_at DESC"
    ).all<AdminPresenceRow>();

    const supportPresenceResults = await c.env.DB.prepare(
      "SELECT * FROM admin_staff_presence WHERE type = 'support' ORDER BY updated_at DESC"
    ).all<AdminPresenceRow>();

    const shiftsResults = await c.env.DB.prepare(
      'SELECT * FROM admin_shift_schedule ORDER BY created_at DESC'
    ).all<AdminShiftRow>();

    const supportCoverageMetrics = await listMetrics(c.env.DB, 'support_coverage');
    const coverageMap = new Map(supportCoverageMetrics.map((metric) => [metric.label, metric]));

    const supportCounts = {
      online: supportPresenceResults.results?.filter((r) => r.status === 'Online').length ?? 0,
      onBreak: supportPresenceResults.results?.filter((r) => r.status === 'Break').length ?? 0,
      offline: supportPresenceResults.results?.filter((r) => r.status === 'Offline').length ?? 0,
    };

    return c.json<ApiResponse>({
      success: true,
      data: {
        groups: Array.from(groupsMap.values()),
        permissions: permissionsResults.results || [],
        moderationRoster: (moderationRosterResults.results || []).map((row) => ({
          name: row.name,
          status: row.status,
        })),
        supportCoverage: {
          ...supportCounts,
          avgResponse: coverageMap.get('Avg response')?.value ?? '0h',
          escalations: coverageMap.get('Escalations')?.value ?? '0',
          backlogRisk: coverageMap.get('Backlog risk')?.value ?? 'Stable',
        },
        shiftTimeline: (shiftsResults.results || []).map((shift) => ({
          label: shift.label,
          time: shift.time_range,
        })),
      },
    });
  } catch (error) {
    console.error('Admin staff error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load staff data' }, 500);
  }
});

admin.post('/admin/staff', async (c) => {
  try {
    const body = await c.req.json<{ email: string; roleTitle?: string; groupLabel: string; status?: string }>();
    if (!body.email || !body.groupLabel) {
      return c.json<ApiResponse>({ success: false, error: 'Email and group are required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_staff_members (id, email, role_title, group_label, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        body.email.trim(),
        body.roleTitle || 'Staff',
        body.groupLabel.trim(),
        body.status || 'Active',
        now,
        now
      )
      .run();

    await logAdminActivity(c.env.DB, 'Added staff member', body.email, 'Users');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create staff error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to add staff member' }, 500);
  }
});

admin.patch('/admin/staff/:staffId', async (c) => {
  try {
    const staffId = c.req.param('staffId');
    const body = await c.req.json<{ status?: string; roleTitle?: string; groupLabel?: string }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.status) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.roleTitle) {
      updates.push('role_title = ?');
      values.push(body.roleTitle);
    }
    if (body.groupLabel) {
      updates.push('group_label = ?');
      values.push(body.groupLabel);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(staffId);

    await c.env.DB.prepare(
      `UPDATE admin_staff_members SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    await logAdminActivity(c.env.DB, 'Updated staff member', `Staff ${staffId}`, 'Users');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update staff error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update staff member' }, 500);
  }
});

// ============================================================================
// Content Moderation
// ============================================================================

admin.get('/admin/content', async (c) => {
  try {
    const metrics = await listMetrics(c.env.DB, 'content_policy');
    const metricMap = new Map(metrics.map((metric) => [metric.label, metric]));

    const policyMetrics = [
      { label: 'Open Reports', value: metricMap.get('Open Reports')?.value ?? '0', tone: 'warning' },
      { label: 'Auto-Resolved', value: metricMap.get('Auto-Resolved')?.value ?? '0', tone: 'success' },
      { label: 'Escalations', value: metricMap.get('Escalations')?.value ?? '0', tone: 'danger' },
      { label: 'Appeals Pending', value: metricMap.get('Appeals Pending')?.value ?? '0', tone: 'neutral' },
    ];

    const flaggedItems = (await listItems(c.env.DB, 'content_flags')).map((item) => ({
      id: item.id,
      content: item.title,
      reporter: item.detail ?? 'unknown',
      severity: item.severity ?? 'Medium',
      status: item.status ?? 'Pending',
      time: item.updatedAt,
    }));

    const appeals = (await listItems(c.env.DB, 'content_appeals')).map((item) => ({
      id: item.id,
      user: item.title,
      reason: item.detail ?? '',
      status: item.status ?? 'Open',
    }));

    const policies = (await listItems(c.env.DB, 'content_policies')).map((item) => ({
      label: item.title,
      status: item.status ?? 'Manual',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { policyMetrics, flaggedItems, appeals, policies },
    });
  } catch (error) {
    console.error('Admin content error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load content data' }, 500);
  }
});

// ============================================================================
// Chat Moderation
// ============================================================================

admin.get('/admin/chat', async (c) => {
  try {
    const rooms = (await listItems(c.env.DB, 'chat_rooms')).map((item) => ({
      id: item.id,
      name: item.title,
      participants: item.meta.participants ?? 0,
      alerts: item.meta.alerts ?? 0,
      status: item.status ?? 'Live',
    }));

    const queue = (await listItems(c.env.DB, 'chat_queue')).map((item) => ({
      id: item.id,
      user: item.title,
      issue: item.detail ?? '',
      action: item.status ?? 'Review',
      time: item.updatedAt,
    }));

    const incidents = (await listItems(c.env.DB, 'chat_incidents')).map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity ?? 'Medium',
      status: item.status ?? 'Investigating',
    }));

    const policies = (await listItems(c.env.DB, 'chat_policies')).map((item) => ({
      label: item.title,
      status: item.status ?? 'Enabled',
    }));

    const notes = (await listItems(c.env.DB, 'chat_notes')).map((item) => ({
      id: item.id,
      note: item.title,
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { rooms, queue, incidents, policies, notes },
    });
  } catch (error) {
    console.error('Admin chat error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load chat data' }, 500);
  }
});

// ============================================================================
// Support
// ============================================================================

admin.get('/admin/support', async (c) => {
  try {
    const ticketsResults = await c.env.DB.prepare(
      'SELECT * FROM admin_support_tickets ORDER BY updated_at DESC'
    ).all<AdminSupportTicketRow>();

    const tickets = (ticketsResults.results || []).map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      requester: ticket.requester_handle ?? 'unknown',
      priority: ticket.priority,
      status: ticket.status,
      updated: ticket.updated_at,
    }));

    const slaMetrics = (await listMetrics(c.env.DB, 'support_sla')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      target: metric.meta.target ?? '',
      tone: metric.tone ?? 'neutral',
    }));

    const supportCoverageMetrics = await listMetrics(c.env.DB, 'support_coverage');
    const coverageMap = new Map(supportCoverageMetrics.map((metric) => [metric.label, metric]));

    const supportPresenceResults = await c.env.DB.prepare(
      "SELECT * FROM admin_staff_presence WHERE type = 'support'"
    ).all<AdminPresenceRow>();

    const agentCoverage = {
      online: supportPresenceResults.results?.filter((r) => r.status === 'Online').length ?? 0,
      onBreak: supportPresenceResults.results?.filter((r) => r.status === 'Break').length ?? 0,
      backlogRisk: coverageMap.get('Backlog risk')?.value ?? 'Stable',
      compliance: coverageMap.get('SLA compliance')?.value ?? '0%',
    };

    const knowledgeBase = (await listItems(c.env.DB, 'support_kb')).map((item) => ({
      id: item.id,
      title: item.title,
      views: item.detail ?? '0 views',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { tickets, slaMetrics, agentCoverage, knowledgeBase },
    });
  } catch (error) {
    console.error('Admin support error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load support data' }, 500);
  }
});

admin.post('/admin/support/tickets', async (c) => {
  try {
    const body = await c.req.json<{
      subject: string;
      requester?: string;
      priority?: string;
    }>();

    if (!body.subject?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Subject is required' }, 400);
    }

    const now = new Date().toISOString();
    const id = `#${Math.floor(Math.random() * 9000 + 1000)}`;

    await c.env.DB.prepare(
      `INSERT INTO admin_support_tickets (id, subject, requester_handle, priority, status, updated_at, created_at)
       VALUES (?, ?, ?, ?, 'Open', ?, ?)`
    )
      .bind(id, body.subject.trim(), body.requester ?? null, body.priority ?? 'Medium', now, now)
      .run();

    await logAdminActivity(c.env.DB, 'Created support ticket', body.subject, 'MessageSquare');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create ticket error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create ticket' }, 500);
  }
});

admin.patch('/admin/support/tickets/:ticketId', async (c) => {
  try {
    const ticketId = c.req.param('ticketId');
    const body = await c.req.json<{ status?: string; priority?: string }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.status) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.priority) {
      updates.push('priority = ?');
      values.push(body.priority);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(ticketId);

    await c.env.DB.prepare(
      `UPDATE admin_support_tickets SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    await logAdminActivity(c.env.DB, 'Updated support ticket', ticketId, 'MessageSquare');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update ticket error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update ticket' }, 500);
  }
});

// ============================================================================
// Security
// ============================================================================

admin.get('/admin/security', async (c) => {
  try {
    const alerts = (await listItems(c.env.DB, 'security_alerts')).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail ?? '',
      severity: item.severity ?? 'Medium',
      status: item.status ?? 'Open',
    }));

    const accessLogs = (await listItems(c.env.DB, 'access_logs')).map((item) => ({
      id: item.id,
      actor: item.title,
      action: item.detail ?? '',
      time: item.updatedAt,
    }));

    const authHealth = (await listMetrics(c.env.DB, 'auth_health')).map((metric) => ({
      label: metric.label,
      value: metric.value,
    }));

    const readiness = (await listMetrics(c.env.DB, 'incident_readiness')).map((metric) => ({
      label: metric.label,
      value: metric.value,
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { alerts, accessLogs, authHealth, readiness },
    });
  } catch (error) {
    console.error('Admin security error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load security data' }, 500);
  }
});

// ============================================================================
// API Management
// ============================================================================

admin.get('/admin/api', async (c) => {
  try {
    const endpoints = (await listItems(c.env.DB, 'api_endpoints')).map((item) => ({
      name: item.title,
      latency: item.meta.latency ?? '',
      uptime: item.meta.uptime ?? '',
      status: item.status ?? 'Healthy',
    }));

    const apiKeysResults = await c.env.DB.prepare(
      'SELECT * FROM admin_api_keys ORDER BY created_at DESC'
    ).all<AdminApiKeyRow>();
    const apiKeys = (apiKeysResults.results || []).map((key) => ({
      id: key.id,
      owner: key.owner,
      scope: key.scope,
      lastUsed: key.last_used_at ?? key.created_at,
      key: key.api_key,
    }));

    const rateLimits = (await listItems(c.env.DB, 'rate_limits')).map((item) => ({
      tier: item.title,
      limit: item.meta.limit ?? '',
      burst: item.meta.burst ?? '',
      status: item.status ?? 'Stable',
    }));

    const webhooks = (await listItems(c.env.DB, 'webhooks')).map((item) => ({
      name: item.title,
      status: item.status ?? 'Healthy',
      detail: item.detail ?? '',
    }));

    const gatewayControls = (await listItems(c.env.DB, 'gateway_controls')).map((item) => ({
      label: item.title,
      status: item.status ?? 'Standby',
      detail: item.detail ?? '',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { endpoints, apiKeys, rateLimits, webhooks, gatewayControls },
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load API data' }, 500);
  }
});

admin.post('/admin/api/keys', async (c) => {
  try {
    const body = await c.req.json<{ owner: string; scope: string }>();
    if (!body.owner || !body.scope) {
      return c.json<ApiResponse>({ success: false, error: 'Owner and scope required' }, 400);
    }

    const now = new Date().toISOString();
    const keyValue = `fh_${Math.random().toString(36).slice(2, 10)}`;
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO admin_api_keys (id, api_key, owner, scope, last_used_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, keyValue, body.owner.trim(), body.scope.trim(), now, now)
      .run();

    await logAdminActivity(c.env.DB, 'Created API key', body.owner, 'Key');

    return c.json<ApiResponse>({ success: true, data: { id, key: keyValue } });
  } catch (error) {
    console.error('Create API key error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create API key' }, 500);
  }
});

admin.post('/admin/api/keys/:keyId/revoke', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE admin_api_keys SET revoked_at = ? WHERE id = ?'
    )
      .bind(now, keyId)
      .run();

    await logAdminActivity(c.env.DB, 'Revoked API key', keyId, 'AlertTriangle');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to revoke API key' }, 500);
  }
});

// ============================================================================
// Tokens
// ============================================================================

admin.get('/admin/tokens', async (c) => {
  try {
    const usage = (await listMetrics(c.env.DB, 'token_usage')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      delta: metric.delta ?? '',
    }));

    const ledger = (await listItems(c.env.DB, 'token_ledger')).map((item) => ({
      id: item.id,
      type: item.title,
      amount: item.detail ?? '',
      status: item.status ?? 'Posted',
      time: item.updatedAt,
    }));

    const planMix = (await listItems(c.env.DB, 'plan_mix')).map((item) => ({
      plan: item.title,
      users: item.detail ?? '',
      share: item.status ?? '',
    }));

    const revenueHealth = (await listMetrics(c.env.DB, 'revenue_health')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone ?? 'neutral',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { usage, ledger, planMix, revenueHealth },
    });
  } catch (error) {
    console.error('Admin tokens error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load token data' }, 500);
  }
});

admin.post('/admin/tokens/ledger', async (c) => {
  try {
    const body = await c.req.json<{ type: string; amount: string; status?: string }>();
    if (!body.type || !body.amount) {
      return c.json<ApiResponse>({ success: false, error: 'Type and amount required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_items (id, category, title, status, severity, detail, meta, created_at, updated_at)
       VALUES (?, 'token_ledger', ?, ?, NULL, ?, NULL, ?, ?)`
    )
      .bind(crypto.randomUUID(), body.type, body.status ?? 'Posted', body.amount, now, now)
      .run();

    await logAdminActivity(c.env.DB, 'Issued credits', `${body.amount} credits`, 'Zap');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Ledger entry error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create ledger entry' }, 500);
  }
});

// ============================================================================
// Database
// ============================================================================

admin.get('/admin/database', async (c) => {
  try {
    const clusters = (await listItems(c.env.DB, 'db_clusters')).map((item) => ({
      name: item.title,
      status: item.status ?? 'Healthy',
      usage: item.meta.usage ?? '',
      lag: item.meta.lag ?? '',
    }));

    const backups = (await listItems(c.env.DB, 'db_backups')).map((item) => ({
      id: item.title,
      type: item.meta.type ?? 'Full',
      age: item.updatedAt,
      status: item.status ?? 'Complete',
    }));

    const queues = (await listItems(c.env.DB, 'db_queues')).map((item) => ({
      queue: item.title,
      depth: item.detail ?? '',
      status: item.status ?? 'Stable',
    }));

    const storage = (await listMetrics(c.env.DB, 'storage_risk')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone ?? 'neutral',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { clusters, backups, queues, storage },
    });
  } catch (error) {
    console.error('Admin database error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load database data' }, 500);
  }
});

admin.post('/admin/database/backups', async (c) => {
  try {
    const body = await c.req.json<{ snapshotId?: string; backupType?: string }>();
    const now = new Date().toISOString();
    const snapshotId = body.snapshotId ?? `snap-${Math.floor(Math.random() * 9000 + 1000)}`;

    await c.env.DB.prepare(
      `INSERT INTO admin_items (id, category, title, status, severity, detail, meta, created_at, updated_at)
       VALUES (?, 'db_backups', ?, 'Complete', NULL, NULL, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        snapshotId,
        JSON.stringify({ type: body.backupType ?? 'Full' }),
        now,
        now
      )
      .run();

    await logAdminActivity(c.env.DB, 'Created snapshot', snapshotId, 'Database');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create backup error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create backup' }, 500);
  }
});

// ============================================================================
// Broadcast
// ============================================================================

admin.get('/admin/broadcast', async (c) => {
  try {
    const campaignsResults = await c.env.DB.prepare(
      'SELECT * FROM admin_announcements ORDER BY created_at DESC'
    ).all<AdminAnnouncementRow>();

    const campaigns = (campaignsResults.results || []).map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      audience: campaign.audience,
      scheduled: campaign.scheduled_at ?? campaign.created_at,
    }));

    const channels = (await listItems(c.env.DB, 'delivery_channels')).map((item) => ({
      name: item.title,
      status: item.status ?? 'Healthy',
      detail: item.detail ?? '',
    }));

    const segments = (await listItems(c.env.DB, 'audience_segments')).map((item) => ({
      name: item.title,
      size: item.detail ?? '',
      trend: item.status ?? 'Up',
    }));

    const riskAlerts = (await listMetrics(c.env.DB, 'broadcast_risk')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone ?? 'neutral',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { campaigns, channels, segments, riskAlerts },
    });
  } catch (error) {
    console.error('Admin broadcast error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load broadcast data' }, 500);
  }
});

admin.post('/admin/broadcast/campaigns', async (c) => {
  try {
    const body = await c.req.json<{ title: string; audience: string; status?: string; scheduledAt?: string }>();
    if (!body.title || !body.audience) {
      return c.json<ApiResponse>({ success: false, error: 'Title and audience required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_announcements (id, title, audience, status, scheduled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        body.title.trim(),
        body.audience.trim(),
        body.status ?? 'Draft',
        body.scheduledAt ?? null,
        now,
        now
      )
      .run();

    await logAdminActivity(c.env.DB, 'Created broadcast', body.title, 'Megaphone');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create broadcast error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create broadcast' }, 500);
  }
});

// ============================================================================
// Analytics
// ============================================================================

admin.get('/admin/analytics', async (c) => {
  try {
    const kpis = (await listMetrics(c.env.DB, 'analytics_kpis')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      delta: metric.delta ?? '',
    }));

    const reports = (await listItems(c.env.DB, 'analytics_reports')).map((item) => ({
      id: item.id,
      name: item.title,
      status: item.status ?? 'Ready',
      updated: item.updatedAt,
    }));

    const segments = (await listItems(c.env.DB, 'analytics_segments')).map((item) => ({
      name: item.title,
      size: item.detail ?? '',
      trend: item.status ?? 'Up',
    }));

    const insights = (await listMetrics(c.env.DB, 'analytics_insights')).map((metric) => ({
      label: metric.label,
      value: metric.value,
      tone: metric.tone ?? 'neutral',
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { kpis, reports, segments, insights },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load analytics data' }, 500);
  }
});

admin.post('/admin/analytics/reports', async (c) => {
  try {
    const body = await c.req.json<{ name: string; status?: string }>();
    if (!body.name) {
      return c.json<ApiResponse>({ success: false, error: 'Report name required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_items (id, category, title, status, severity, detail, meta, created_at, updated_at)
       VALUES (?, 'analytics_reports', ?, ?, NULL, NULL, NULL, ?, ?)`
    )
      .bind(crypto.randomUUID(), body.name.trim(), body.status ?? 'Running', now, now)
      .run();

    await logAdminActivity(c.env.DB, 'Created report', body.name, 'BarChart3');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create report error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create report' }, 500);
  }
});

// ============================================================================
// System
// ============================================================================

admin.get('/admin/system', async (c) => {
  try {
    const flagsResults = await c.env.DB.prepare(
      'SELECT * FROM admin_feature_flags ORDER BY label ASC'
    ).all<AdminFlagRow>();

    const maintenanceResults = await c.env.DB.prepare(
      'SELECT * FROM admin_maintenance_windows ORDER BY starts_at DESC'
    ).all<AdminMaintenanceRow>();

    const locksResults = await c.env.DB.prepare(
      'SELECT * FROM admin_operational_locks ORDER BY label ASC'
    ).all<AdminOperationalLockRow>();

    const flags = (flagsResults.results || []).map((flag) => ({
      id: flag.id,
      key: flag.key,
      label: flag.label,
      description: flag.description,
      enabled: flag.enabled === 1,
    }));

    const maintenanceWindows = (maintenanceResults.results || []).map((window) => ({
      id: window.id,
      region: window.region,
      time: `${window.starts_at} - ${window.ends_at}`,
      status: window.status,
    }));

    const locks = (locksResults.results || []).map((lock) => ({
      id: lock.id,
      label: lock.label,
      status: lock.status,
      updatedAt: lock.updated_at,
    }));

    return c.json<ApiResponse>({
      success: true,
      data: { flags, maintenanceWindows, locks },
    });
  } catch (error) {
    console.error('Admin system error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load system data' }, 500);
  }
});

admin.patch('/admin/system/flags/:flagKey', async (c) => {
  try {
    const flagKey = c.req.param('flagKey');
    const body = await c.req.json<{ enabled: boolean }>();

    await c.env.DB.prepare(
      'UPDATE admin_feature_flags SET enabled = ?, updated_at = ? WHERE key = ?'
    )
      .bind(body.enabled ? 1 : 0, new Date().toISOString(), flagKey)
      .run();

    await logAdminActivity(c.env.DB, 'Updated feature flag', flagKey, 'ToggleLeft');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update flag error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update feature flag' }, 500);
  }
});

admin.post('/admin/system/maintenance', async (c) => {
  try {
    const body = await c.req.json<{ region: string; startsAt: string; endsAt: string; status?: string }>();
    if (!body.region || !body.startsAt || !body.endsAt) {
      return c.json<ApiResponse>({ success: false, error: 'Region, start, and end times required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_maintenance_windows (id, region, starts_at, ends_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), body.region.trim(), body.startsAt, body.endsAt, body.status ?? 'Scheduled', now, now)
      .run();

    await logAdminActivity(c.env.DB, 'Scheduled maintenance', body.region, 'Clock');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create maintenance window' }, 500);
  }
});

// ============================================================================
// Generic admin items
// ============================================================================

admin.post('/admin/items', async (c) => {
  try {
    const body = await c.req.json<{
      category: string;
      title: string;
      status?: string;
      severity?: string;
      detail?: string;
      meta?: Record<string, unknown>;
    }>();

    if (!body.category || !body.title) {
      return c.json<ApiResponse>({ success: false, error: 'Category and title required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO admin_items (id, category, title, status, severity, detail, meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        body.category,
        body.title,
        body.status ?? null,
        body.severity ?? null,
        body.detail ?? null,
        body.meta ? JSON.stringify(body.meta) : null,
        now,
        now
      )
      .run();

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Create admin item error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create admin item' }, 500);
  }
});

admin.patch('/admin/items/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const body = await c.req.json<{
      title?: string;
      status?: string;
      severity?: string;
      detail?: string;
      meta?: Record<string, unknown>;
    }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.title) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.status) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.severity) {
      updates.push('severity = ?');
      values.push(body.severity);
    }
    if (body.detail !== undefined) {
      updates.push('detail = ?');
      values.push(body.detail);
    }
    if (body.meta) {
      updates.push('meta = ?');
      values.push(JSON.stringify(body.meta));
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(itemId);

    await c.env.DB.prepare(
      `UPDATE admin_items SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update admin item error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update admin item' }, 500);
  }
});

// ============================================================================
// Settings
// ============================================================================

admin.get('/admin/settings', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT key, value, updated_at, updated_by FROM system_settings ORDER BY key ASC'
    ).all<{ key: string; value: string; updated_at: string; updated_by: string | null }>();

    const settings = (results.results || []).reduce((acc, row) => {
      acc[row.key] = {
        value: row.value,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      };
      return acc;
    }, {} as Record<string, { value: string; updatedAt: string; updatedBy: string | null }>);

    return c.json<ApiResponse>({ success: true, data: settings });
  } catch (error) {
    console.error('Admin settings error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load settings' }, 500);
  }
});

admin.patch('/admin/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json<{ value: string }>();
    const userId = c.get('userId');

    if (body.value === undefined) {
      return c.json<ApiResponse>({ success: false, error: 'Value is required' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO system_settings (key, value, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?, updated_by = ?`
    )
      .bind(key, body.value, now, userId, body.value, now, userId)
      .run();

    await logAdminActivity(c.env.DB, 'Updated setting', `${key} = ${body.value}`, 'Settings');

    return c.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Update setting error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update setting' }, 500);
  }
});

export default admin;
