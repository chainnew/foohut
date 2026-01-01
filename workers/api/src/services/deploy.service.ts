/**
 * Deploy Service
 * Handles project deployments to Cloudflare Pages
 */

export interface DeployRecord {
  id: string;
  project_id: string;
  commit_id: string | null;
  deployed_by: string;
  status: 'pending' | 'building' | 'uploading' | 'success' | 'failed' | 'cancelled';
  url: string | null;
  preview_url: string | null;
  is_production: number;
  build_logs: string | null;
  error_message: string | null;
  build_duration_ms: number | null;
  created_at: number;
  completed_at: number | null;
}

export interface CommitRecord {
  id: string;
  project_id: string;
  author_id: string;
  message: string;
  parent_commit_id: string | null;
  files_changed: number;
  insertions: number;
  deletions: number;
  created_at: number;
}

export interface CreateCommitInput {
  message: string;
  files?: Array<{
    path: string;
    content: string | null;
    action: 'add' | 'modify' | 'delete';
  }>;
}

export interface CreateDeployInput {
  commitId?: string;
  isProduction?: boolean;
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new commit for a project
 */
export async function createCommit(
  db: D1Database,
  projectId: string,
  authorId: string,
  input: CreateCommitInput
): Promise<CommitRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  // Get the latest commit as parent
  const latestCommit = await db.prepare(
    `SELECT id FROM project_commits 
     WHERE project_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`
  )
    .bind(projectId)
    .first<{ id: string }>();

  // Calculate file stats if files provided
  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  if (input.files && input.files.length > 0) {
    filesChanged = input.files.length;
    for (const file of input.files) {
      if (file.action === 'add' || file.action === 'modify') {
        insertions += (file.content?.split('\n').length || 0);
      }
      if (file.action === 'delete') {
        deletions += 1;
      }
    }
  }

  await db.prepare(
    `INSERT INTO project_commits (id, project_id, author_id, message, parent_commit_id, files_changed, insertions, deletions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, projectId, authorId, input.message, latestCommit?.id || null, filesChanged, insertions, deletions, now)
    .run();

  // Store file snapshots if provided
  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      const snapshotId = generateId();
      await db.prepare(
        `INSERT INTO commit_file_snapshots (id, commit_id, file_path, content, action, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(snapshotId, id, file.path, file.content, file.action, now)
        .run();
    }
  }

  return {
    id,
    project_id: projectId,
    author_id: authorId,
    message: input.message,
    parent_commit_id: latestCommit?.id || null,
    files_changed: filesChanged,
    insertions,
    deletions,
    created_at: now,
  };
}

/**
 * List commits for a project
 */
export async function listCommits(
  db: D1Database,
  projectId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ commits: CommitRecord[]; total: number }> {
  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM project_commits WHERE project_id = ?'
  )
    .bind(projectId)
    .first<{ count: number }>();

  const commits = await db.prepare(
    `SELECT * FROM project_commits 
     WHERE project_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  )
    .bind(projectId, limit, offset)
    .all<CommitRecord>();

  return {
    commits: commits.results || [],
    total: countResult?.count || 0,
  };
}

/**
 * Get a specific commit
 */
export async function getCommit(
  db: D1Database,
  commitId: string
): Promise<CommitRecord | null> {
  return db.prepare('SELECT * FROM project_commits WHERE id = ?')
    .bind(commitId)
    .first<CommitRecord>();
}

/**
 * Create a new deploy for a project
 */
export async function createDeploy(
  db: D1Database,
  projectId: string,
  deployedBy: string,
  input: CreateDeployInput
): Promise<DeployRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO project_deploys (id, project_id, commit_id, deployed_by, status, is_production, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  )
    .bind(id, projectId, input.commitId || null, deployedBy, input.isProduction ? 1 : 0, now)
    .run();

  return {
    id,
    project_id: projectId,
    commit_id: input.commitId || null,
    deployed_by: deployedBy,
    status: 'pending',
    url: null,
    preview_url: null,
    is_production: input.isProduction ? 1 : 0,
    build_logs: null,
    error_message: null,
    build_duration_ms: null,
    created_at: now,
    completed_at: null,
  };
}

/**
 * Update deploy status
 */
export async function updateDeployStatus(
  db: D1Database,
  deployId: string,
  status: DeployRecord['status'],
  updates?: {
    url?: string;
    preview_url?: string;
    build_logs?: string;
    error_message?: string;
    build_duration_ms?: number;
  }
): Promise<DeployRecord | null> {
  const now = Math.floor(Date.now() / 1000);
  const isComplete = status === 'success' || status === 'failed' || status === 'cancelled';

  const fields: string[] = ['status = ?'];
  const values: (string | number | null)[] = [status];

  if (updates?.url) {
    fields.push('url = ?');
    values.push(updates.url);
  }
  if (updates?.preview_url) {
    fields.push('preview_url = ?');
    values.push(updates.preview_url);
  }
  if (updates?.build_logs) {
    fields.push('build_logs = ?');
    values.push(updates.build_logs);
  }
  if (updates?.error_message) {
    fields.push('error_message = ?');
    values.push(updates.error_message);
  }
  if (updates?.build_duration_ms) {
    fields.push('build_duration_ms = ?');
    values.push(updates.build_duration_ms);
  }
  if (isComplete) {
    fields.push('completed_at = ?');
    values.push(now);
  }

  values.push(deployId);

  await db.prepare(
    `UPDATE project_deploys SET ${fields.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();

  return db.prepare('SELECT * FROM project_deploys WHERE id = ?')
    .bind(deployId)
    .first<DeployRecord>();
}

/**
 * List deploys for a project
 */
export async function listDeploys(
  db: D1Database,
  projectId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ deploys: DeployRecord[]; total: number }> {
  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM project_deploys WHERE project_id = ?'
  )
    .bind(projectId)
    .first<{ count: number }>();

  const deploys = await db.prepare(
    `SELECT * FROM project_deploys 
     WHERE project_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  )
    .bind(projectId, limit, offset)
    .all<DeployRecord>();

  return {
    deploys: deploys.results || [],
    total: countResult?.count || 0,
  };
}

/**
 * Get a specific deploy
 */
export async function getDeploy(
  db: D1Database,
  deployId: string
): Promise<DeployRecord | null> {
  return db.prepare('SELECT * FROM project_deploys WHERE id = ?')
    .bind(deployId)
    .first<DeployRecord>();
}

/**
 * Get the latest production deploy for a project
 */
export async function getLatestProductionDeploy(
  db: D1Database,
  projectId: string
): Promise<DeployRecord | null> {
  return db.prepare(
    `SELECT * FROM project_deploys 
     WHERE project_id = ? AND is_production = 1 AND status = 'success'
     ORDER BY created_at DESC 
     LIMIT 1`
  )
    .bind(projectId)
    .first<DeployRecord>();
}

/**
 * Build and deploy a project to Cloudflare Pages
 * This is a simplified implementation - in production you'd use the Pages API
 */
export async function buildAndDeploy(
  db: D1Database,
  deployId: string,
  projectSlug: string,
  files: Array<{ path: string; content: string | null }>
): Promise<{ success: boolean; url?: string; error?: string }> {
  const startTime = Date.now();

  try {
    // Update status to building
    await updateDeployStatus(db, deployId, 'building');

    // In a real implementation, you would:
    // 1. Bundle the project files
    // 2. Run build commands (npm run build, etc.)
    // 3. Upload to Cloudflare Pages API
    // 4. Wait for deployment to complete

    // For now, we'll simulate a successful deploy
    const deployUrl = `https://${projectSlug}.foohut.dev`;
    const previewUrl = `https://${deployId.slice(0, 8)}.${projectSlug}.foohut.dev`;

    // Update status to uploading
    await updateDeployStatus(db, deployId, 'uploading');

    // Simulate upload delay
    // In production, this would be the actual Pages API call

    const buildDuration = Date.now() - startTime;

    // Update to success
    await updateDeployStatus(db, deployId, 'success', {
      url: deployUrl,
      preview_url: previewUrl,
      build_duration_ms: buildDuration,
      build_logs: `Build started at ${new Date(startTime).toISOString()}\nFiles: ${files.length}\nBuild completed in ${buildDuration}ms\nDeployed to: ${deployUrl}`,
    });

    return { success: true, url: deployUrl };
  } catch (error) {
    const buildDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateDeployStatus(db, deployId, 'failed', {
      error_message: errorMessage,
      build_duration_ms: buildDuration,
      build_logs: `Build failed: ${errorMessage}`,
    });

    return { success: false, error: errorMessage };
  }
}
