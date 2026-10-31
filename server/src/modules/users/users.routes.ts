import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly } from '../../middleware/require-role';
import { createUserSchema, updateUserSchema, userListQuery } from './users.schema';
import * as ctrl from './users.controller';

// Mounted at /api/users (behind `authenticate`). Admin only: "Only the admin can add a new member of staff." Issue #7.
export const usersRouter = Router();

usersRouter.use(adminOnly);
usersRouter.get('/', validate({ query: userListQuery }), ctrl.list);
usersRouter.post('/', validate({ body: createUserSchema }), ctrl.create);
usersRouter.patch('/:id', validate({ params: idParams, body: updateUserSchema }), ctrl.update);
