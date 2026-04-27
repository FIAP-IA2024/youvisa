import { Hono } from 'hono';
import guidance from '@/knowledge/visa-guidance.json';

export const knowledgeRoute = new Hono();

/**
 * GET /knowledge/visa-guidance
 * Returns the visa guidance JSON keyed by FSM status. Single source of
 * truth for both the Response Generator (server-side, agent) and the
 * customer portal "next steps" panel (client-side, frontend).
 */
knowledgeRoute.get('/knowledge/visa-guidance', (c) => c.json(guidance));
