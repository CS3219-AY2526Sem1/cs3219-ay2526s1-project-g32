import { Router } from 'express';

import {
  loginHandler,
  meHandler,
  registerHandler,
  resendVerificationHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, registerSchema, sendMagicLinkSchema } from '../validation/authSchemas';

const router = Router();

router.post('/register', validateRequest(registerSchema), registerHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/send-otp', validateRequest(sendMagicLinkSchema), resendVerificationHandler);
router.get('/me', authenticate, meHandler);

export const authRouter = router;
