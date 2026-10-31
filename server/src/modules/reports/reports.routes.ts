import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import { overdueQuery, reportFilters, trendQuery } from './reports.schema';
import * as ctrl from './reports.controller';

// Mounted at /api/reports (behind `authenticate`). Issue #11 (M11).
export const reportsRouter = Router();

reportsRouter.use(staff);
reportsRouter.get('/summary', validate({ query: reportFilters }), ctrl.summary);
reportsRouter.get('/revenue-trend', validate({ query: trendQuery }), ctrl.revenueTrend);
reportsRouter.get('/overdue', validate({ query: overdueQuery }), ctrl.overdue);
reportsRouter.get('/by-plan', validate({ query: reportFilters }), ctrl.byPlan);
