import { Router } from 'express';

import {
  loginHandler,
  meHandler,
  registerHandler,
  sendOtpHandler,
  verifyOtpHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../validation/authSchemas';

const router = Router();

router.post('/register', validateRequest(registerSchema),registerHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/send-otp', validateRequest(sendOtpSchema), sendOtpHandler);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtpHandler);
router.get('/me', authenticate, meHandler);

export const authRouter = router;
