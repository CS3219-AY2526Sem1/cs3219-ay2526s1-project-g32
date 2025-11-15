import { Router } from 'express';

import {
  loginHandler,
  meHandler,
  registerHandler,
  resendVerificationHandler,
  validateTokenHandler,
  setAdminStatusHandler,
  setAdminStatusByEmailHandler,
  updatePasswordHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateRequest } from '../middleware/validateRequest';
import {
  loginSchema,
  registerSchema,
  sendMagicLinkSchema,
  validateTokenSchema,
  setAdminStatusSchema,
  setAdminStatusByEmailSchema,
  updatePasswordSchema,
} from '../validation/authSchemas';

const router = Router();

router.post('/register', validateRequest(registerSchema), registerHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/send-otp', validateRequest(sendMagicLinkSchema), resendVerificationHandler);
router.post('/token/validate', validateRequest(validateTokenSchema), validateTokenHandler);
router.get('/me', authenticate, meHandler);
router.patch(
  '/users/:userId/admin',
  authenticate,
  requireAdmin,
  validateRequest(setAdminStatusSchema),
  setAdminStatusHandler,
);
router.patch(
  '/admin/set-by-email',
  authenticate,
  requireAdmin,
  validateRequest(setAdminStatusByEmailSchema),
  setAdminStatusByEmailHandler,
);
router.patch(
  '/password',
  authenticate,
  validateRequest(updatePasswordSchema),
  updatePasswordHandler,
);

export const authRouter = router;
