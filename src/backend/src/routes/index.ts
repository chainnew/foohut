/**
 * Route aggregator for foohut.com backend API
 */

import { Router } from 'express';
import authRoutes from './auth.js';
import organizationsRoutes from './organizations.js';
import collectionsRoutes from './collections.js';
import spacesRoutes from './spaces.js';
import pagesRoutes from './pages.js';
import aiRoutes from './ai.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// API v1 routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/collections', collectionsRoutes);
router.use('/spaces', spacesRoutes);
router.use('/pages', pagesRoutes);
router.use('/ai', aiRoutes);

export default router;
