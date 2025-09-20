import type { NextFunction, Request, Response } from 'express';

import {
  loginUser,
  registerUser,
  sendOtp,
  verifyOtp,
} from '../services/auth.service';

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const sendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await sendOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await verifyOtp(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
