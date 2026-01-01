/**
 * Project Service
 * Handles CRUD operations for developer projects
 */

/**
 * Project visibility types
 */
export type ProjectVisibility = 'public' | 'semi_public' | 'private';

/**
 * Collaborator role types
 */
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Project record from database
 */
export interface ProjectRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: ProjectVisibility;
  showcase_description: string | null;
  tech_stack: string | null;
  looking_for: string | null;
  readme_content: string | null;
  default_branch: string;
  stars_count: number;
  forks_count: number;
  forked_from_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Project with owner info
 */
export interface ProjectWithOwner extends ProjectRecord {
  owner_email: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
}

/**
 * Create project input
 */
export interface CreateProjectInput {
  name: string;
  slug?: string;
  description?: string;
  visibility?: ProjectVisibility;
  showcaseDescription?: string;
  techStack?: string;
  lookingFor?: string;
  readmeContent?: string;
  defaultBranch?: string;
}

/**
 * Update project input
 */
export interface UpdateProjectInput {
  name?: string;
  slug?: string;
  description?: string;
  visibility?: ProjectVisibility;
  showcaseDescription?: string;
  techStack?: string;
  lookingFor?: string;
  readmeContent?: string;
  defaultBranch?: string;
}

/**
 * Project list filters
 */
export interface ProjectFilters {
  visibility?: ProjectVisibility;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'stars_count' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a URL-friendly slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Get current Unix timestamp
 */
function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create a new project
 */
export async function createProject(
  db: D1Database,
  ownerId: string,
  data: CreateProjectInput
): Promise<ProjectRecord> {
  const id = generateId();
  const slug = data.slug || generateSlug(data.name);
  const timestamp = now();

  // Check if slug is unique for this owner
  const existing = await db
    .prepare('SELECT id FROM projects WHERE owner_id = ? AND slug = ?')
    .bind(ownerId, slug)
    .first();

  if (existing) {
    throw new Error('A project with this slug already exists');
  }

  await db
    .prepare(
      `INSERT INTO projects (
        id, owner_id, name, slug, description, visibility,
        showcase_description, tech_stack, looking_for, readme_content,
        default_branch, stars_count, forks_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
    )
    .bind(
      id,
      ownerId,
      data.name,
      slug,
      data.description || null,
      data.visibility || 'private',
      data.showcaseDescription || null,
      data.techStack || null,
      data.lookingFor || null,
      data.readmeContent || null,
      data.defaultBranch || 'main',
      timestamp,
      timestamp
    )
    .run();

  // Add owner as collaborator with owner role
  await db
    .prepare(
      `INSERT INTO project_collaborators (project_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`
    )
    .bind(id, ownerId, timestamp)
    .run();

  return {
    id,
    owner_id: ownerId,
    name: data.name,
    slug,
    description: data.description || null,
    visibility: data.visibility || 'private',
    showcase_description: data.showcaseDescription || null,
    tech_stack: data.techStack || null,
    looking_for: data.lookingFor || null,
    readme_content: data.readmeContent || null,
    default_branch: data.defaultBranch || 'main',
    stars_count: 0,
    forks_count: 0,
    forked_from_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Get a project by ID
 */
export async function getProject(
  db: D1Database,
  projectId: string
): Promise<ProjectWithOwner | null> {
  const result = await db
    .prepare(
      `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
       FROM projects p
       INNER JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`
    )
    .bind(projectId)
    .first<ProjectWithOwner>();

  return result || null;
}

/**
 * Get a project by owner ID and slug
 */
export async function getProjectBySlug(
  db: D1Database,
  ownerId: string,
  slug: string
): Promise<ProjectWithOwner | null> {
  const result = await db
    .prepare(
      `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
       FROM projects p
       INNER JOIN users u ON p.owner_id = u.id
       WHERE p.owner_id = ? AND p.slug = ?`
    )
    .bind(ownerId, slug)
    .first<ProjectWithOwner>();

  return result || null;
}

/**
 * Get a project by username and slug
 */
export async function getProjectByUsernameAndSlug(
  db: D1Database,
  username: string,
  slug: string
): Promise<ProjectWithOwner | null> {
  // Username is derived from email (before @)
  const result = await db
    .prepare(
      `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
       FROM projects p
       INNER JOIN users u ON p.owner_id = u.id
       WHERE (u.display_name = ? OR SUBSTR(u.email, 1, INSTR(u.email, '@') - 1) = ?) AND p.slug = ?`
    )
    .bind(username, username, slug)
    .first<ProjectWithOwner>();

  return result || null;
}

/**
 * Update a project
 */
export async function updateProject(
  db: D1Database,
  projectId: string,
  data: UpdateProjectInput
): Promise<ProjectRecord | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    fields.push('slug = ?');
    values.push(data.slug);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.visibility !== undefined) {
    fields.push('visibility = ?');
    values.push(data.visibility);
  }
  if (data.showcaseDescription !== undefined) {
    fields.push('showcase_description = ?');
    values.push(data.showcaseDescription);
  }
  if (data.techStack !== undefined) {
    fields.push('tech_stack = ?');
    values.push(data.techStack);
  }
  if (data.lookingFor !== undefined) {
    fields.push('looking_for = ?');
    values.push(data.lookingFor);
  }
  if (data.readmeContent !== undefined) {
    fields.push('readme_content = ?');
    values.push(data.readmeContent);
  }
  if (data.defaultBranch !== undefined) {
    fields.push('default_branch = ?');
    values.push(data.defaultBranch);
  }

  if (fields.length === 0) {
    // No updates, return current project
    return db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<ProjectRecord>();
  }

  fields.push('updated_at = ?');
  values.push(now());
  values.push(projectId);

  await db
    .prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first<ProjectRecord>();
}

/**
 * Delete a project
 */
export async function deleteProject(db: D1Database, projectId: string): Promise<void> {
  await db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId).run();
}

/**
 * List projects for a user (owner or collaborator)
 */
export async function listUserProjects(
  db: D1Database,
  userId: string,
  filters: ProjectFilters = {}
): Promise<{ projects: ProjectRecord[]; total: number }> {
  const {
    visibility,
    search,
    limit = 20,
    offset = 0,
    sortBy = 'updated_at',
    sortOrder = 'desc',
  } = filters;

  const conditions: string[] = ['(p.owner_id = ? OR pc.user_id = ?)'];
  const values: (string | number)[] = [userId, userId];

  if (visibility) {
    conditions.push('p.visibility = ?');
    values.push(visibility);
  }

  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    const searchPattern = `%${search}%`;
    values.push(searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = `ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;

  // Get total count
  const countResult = await db
    .prepare(
      `SELECT COUNT(DISTINCT p.id) as total FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id
       ${whereClause}`
    )
    .bind(...values)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get projects with pagination
  const projectValues = [...values, limit, offset];
  const projects = await db
    .prepare(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_collaborators pc ON p.id = pc.project_id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`
    )
    .bind(...projectValues)
    .all<ProjectRecord>();

  return {
    projects: projects.results || [],
    total,
  };
}

/**
 * Search public projects
 */
export async function searchProjects(
  db: D1Database,
  query: string,
  filters: Omit<ProjectFilters, 'visibility'> = {}
): Promise<{ projects: ProjectWithOwner[]; total: number }> {
  const { search, limit = 20, offset = 0, sortBy = 'stars_count', sortOrder = 'desc' } = filters;

  const conditions: string[] = ["p.visibility = 'public'"];
  const values: (string | number)[] = [];

  if (query) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.tech_stack LIKE ?)');
    const searchPattern = `%${query}%`;
    values.push(searchPattern, searchPattern, searchPattern);
  }

  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    const searchPattern = `%${search}%`;
    values.push(searchPattern, searchPattern);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const orderClause = `ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM projects p ${whereClause}`)
    .bind(...values)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get projects with owner info
  const projectValues = [...values, limit, offset];
  const projects = await db
    .prepare(
      `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
       FROM projects p
       INNER JOIN users u ON p.owner_id = u.id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`
    )
    .bind(...projectValues)
    .all<ProjectWithOwner>();

  return {
    projects: projects.results || [],
    total,
  };
}

/**
 * Star a project
 */
export async function starProject(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<boolean> {
  const timestamp = now();

  // Check if already starred
  const existing = await db
    .prepare('SELECT 1 FROM project_stars WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .first();

  if (existing) {
    return false; // Already starred
  }

  // Add star
  await db
    .prepare('INSERT INTO project_stars (project_id, user_id, created_at) VALUES (?, ?, ?)')
    .bind(projectId, userId, timestamp)
    .run();

  // Increment stars_count
  await db
    .prepare('UPDATE projects SET stars_count = stars_count + 1 WHERE id = ?')
    .bind(projectId)
    .run();

  return true;
}

/**
 * Unstar a project
 */
export async function unstarProject(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<boolean> {
  // Check if starred
  const existing = await db
    .prepare('SELECT 1 FROM project_stars WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .first();

  if (!existing) {
    return false; // Not starred
  }

  // Remove star
  await db
    .prepare('DELETE FROM project_stars WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .run();

  // Decrement stars_count
  await db
    .prepare('UPDATE projects SET stars_count = stars_count - 1 WHERE id = ? AND stars_count > 0')
    .bind(projectId)
    .run();

  return true;
}

/**
 * Check if user has starred a project
 */
export async function hasStarred(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM project_stars WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .first();

  return !!result;
}

/**
 * Fork a project
 */
export async function forkProject(
  db: D1Database,
  projectId: string,
  userId: string,
  newName?: string
): Promise<ProjectRecord> {
  // Get original project
  const original = await getProject(db, projectId);
  if (!original) {
    throw new Error('Project not found');
  }

  // Cannot fork private projects unless you have access
  if (original.visibility === 'private' && original.owner_id !== userId) {
    const hasAccess = await checkProjectAccess(db, projectId, userId);
    if (!hasAccess) {
      throw new Error('Cannot fork private project without access');
    }
  }

  const id = generateId();
  const timestamp = now();
  const name = newName || original.name;
  let slug = generateSlug(name);

  // Ensure unique slug for this user
  let counter = 1;
  let slugToUse = slug;
  while (true) {
    const existing = await db
      .prepare('SELECT id FROM projects WHERE owner_id = ? AND slug = ?')
      .bind(userId, slugToUse)
      .first();
    if (!existing) break;
    slugToUse = `${slug}-${counter}`;
    counter++;
  }

  await db
    .prepare(
      `INSERT INTO projects (
        id, owner_id, name, slug, description, visibility,
        showcase_description, tech_stack, looking_for, readme_content,
        default_branch, stars_count, forks_count, forked_from_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'private', ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      name,
      slugToUse,
      original.description,
      original.showcase_description,
      original.tech_stack,
      original.looking_for,
      original.readme_content,
      original.default_branch,
      original.id,
      timestamp,
      timestamp
    )
    .run();

  // Add owner as collaborator
  await db
    .prepare(
      `INSERT INTO project_collaborators (project_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`
    )
    .bind(id, userId, timestamp)
    .run();

  // Increment forks_count on original
  await db
    .prepare('UPDATE projects SET forks_count = forks_count + 1 WHERE id = ?')
    .bind(original.id)
    .run();

  // Copy files from original project
  await db
    .prepare(
      `INSERT INTO project_files (id, project_id, path, content_hash, content, is_directory, size, language, created_at, updated_at)
       SELECT ?, ?, path, content_hash, content, is_directory, size, language, ?, ?
       FROM project_files WHERE project_id = ?`
    )
    .bind(generateId(), id, timestamp, timestamp, original.id)
    .run();

  return {
    id,
    owner_id: userId,
    name,
    slug: slugToUse,
    description: original.description,
    visibility: 'private',
    showcase_description: original.showcase_description,
    tech_stack: original.tech_stack,
    looking_for: original.looking_for,
    readme_content: original.readme_content,
    default_branch: original.default_branch,
    stars_count: 0,
    forks_count: 0,
    forked_from_id: original.id,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Check if user has access to a project
 */
export async function checkProjectAccess(
  db: D1Database,
  projectId: string,
  userId: string,
  minRole?: CollaboratorRole
): Promise<boolean> {
  // Check if project exists and get visibility
  const project = await db
    .prepare('SELECT owner_id, visibility FROM projects WHERE id = ?')
    .bind(projectId)
    .first<{ owner_id: string; visibility: string }>();

  if (!project) {
    return false;
  }

  // Owner always has access
  if (project.owner_id === userId) {
    return true;
  }

  // Public projects are accessible to everyone for viewing
  if (project.visibility === 'public' && !minRole) {
    return true;
  }

  // Check collaborator role
  const collaborator = await db
    .prepare('SELECT role FROM project_collaborators WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .first<{ role: CollaboratorRole }>();

  if (!collaborator) {
    return false;
  }

  if (!minRole) {
    return true;
  }

  // Check role hierarchy
  const roleHierarchy: CollaboratorRole[] = ['viewer', 'editor', 'admin', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(collaborator.role);
  const minRoleIndex = roleHierarchy.indexOf(minRole);

  return userRoleIndex >= minRoleIndex;
}

/**
 * Get user's starred projects
 */
export async function getUserStarredProjects(
  db: D1Database,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ projects: ProjectWithOwner[]; total: number }> {
  // Get total count
  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM project_stars WHERE user_id = ?')
    .bind(userId)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get starred projects
  const projects = await db
    .prepare(
      `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
       FROM projects p
       INNER JOIN users u ON p.owner_id = u.id
       INNER JOIN project_stars ps ON p.id = ps.project_id
       WHERE ps.user_id = ?
       ORDER BY ps.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(userId, limit, offset)
    .all<ProjectWithOwner>();

  return {
    projects: projects.results || [],
    total,
  };
}

/**
 * Add collaborator to project
 */
export async function addCollaborator(
  db: D1Database,
  projectId: string,
  userId: string,
  role: CollaboratorRole
): Promise<void> {
  const timestamp = now();

  await db
    .prepare(
      `INSERT INTO project_collaborators (project_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = ?, created_at = ?`
    )
    .bind(projectId, userId, role, timestamp, role, timestamp)
    .run();
}

/**
 * Remove collaborator from project
 */
export async function removeCollaborator(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?')
    .bind(projectId, userId)
    .run();
}

/**
 * Get project collaborators
 */
export async function getProjectCollaborators(
  db: D1Database,
  projectId: string
): Promise<
  Array<{
    user_id: string;
    role: CollaboratorRole;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: number;
  }>
> {
  const result = await db
    .prepare(
      `SELECT pc.user_id, pc.role, pc.created_at, u.email, u.display_name, u.avatar_url
       FROM project_collaborators pc
       INNER JOIN users u ON pc.user_id = u.id
       WHERE pc.project_id = ?
       ORDER BY pc.created_at ASC`
    )
    .bind(projectId)
    .all();

  return (result.results || []) as Array<{
    user_id: string;
    role: CollaboratorRole;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: number;
  }>;
}
