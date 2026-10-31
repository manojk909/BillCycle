import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rate-limit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from './auth.schema';
import * as ctrl from './auth.controller';

// Public router (mounted without `authenticate`); /me and /change-password guard themselves.
export const authRouter = Router();

const loginLimit = rateLimit({ windowMs: 60_000, max: 10 });
const resetLimit = rateLimit({ windowMs: 15 * 60_000, max: 5 });

authRouter.post('/signup', validate({ body: signupSchema }), ctrl.signup);
authRouter.post('/login', loginLimit, validate({ body: loginSchema }), ctrl.login);
authRouter.post('/logout', ctrl.logout);
authRouter.get('/me', authenticate, ctrl.me);
authRouter.post(
  '/change-password',
  authenticate,
  loginLimit,
  validate({ body: changePasswordSchema }),
  ctrl.changePassword,
);
authRouter.post(
  '/forgot-password',
  resetLimit,
  validate({ body: forgotPasswordSchema }),
  ctrl.forgotPassword,
);
authRouter.post('/reset-password', resetLimit, validate({ body: resetPasswordSchema }), ctrl.resetPassword);
