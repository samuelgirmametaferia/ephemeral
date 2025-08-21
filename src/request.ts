// MrKing2025
import { Request, Response } from 'express';
import pool from './db';
import rateLimit from 'express-rate-limit';

// username rate limit
const usernameCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 100,
  message: {
    available: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const checkUsernameAvailability = [
  usernameCheckLimiter,
  async (req: Request, res: Response) => {
    const usernameHash = req.query.usernameHash;

    // username check
    console.log('Username check received for:', usernameHash);

    if (typeof usernameHash !== 'string') {
      // bad hash
      console.warn('Invalid username hash:', usernameHash);
      return res.status(400).json({ available: false, message: 'Invalid username hash' });
    }

    try {
      // db check
      const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [usernameHash]);
      console.log('DB result rowCount:', result.rowCount);
      if ((result.rowCount ?? 0) > 0) {
        // taken
        console.log('Username is taken');
        return res.json({ available: false });
      } else {
        // free
        console.log('Username is available');
        return res.json({ available: true });
      }
    } catch (error) {
      // error
      console.error('Error checking username:', error);
      return res.status(500).json({ available: false, message: 'Server error' });
    }
  }
];


// handle rate limit
const handleCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 100,
  message: {
    available: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const checkHandleAvailability = [
  handleCheckLimiter,
  async (req: Request, res: Response) => {
    const handle = req.query.handle as string;

    // handle check
    console.log('Handle check received for:', handle);

    if (typeof handle !== 'string' || handle.trim() === '') {
      console.warn('Invalid handle:', handle);
      return res.status(400).json({ available: false, message: 'Invalid handle' });
    }

    try {
      // db check against plaintext handle
      const result = await pool.query('SELECT 1 FROM users WHERE handle = $1', [handle]);
      console.log('DB result rowCount:', result.rowCount);
      if ((result.rowCount ?? 0) > 0) {
        console.log('Handle is taken');
        return res.json({ available: false });
      } else {
        console.log('Handle is available');
        return res.json({ available: true });
      }
    } catch (error) {
      console.error('Error checking handle:', error);
      return res.status(500).json({ available: false, message: 'Server error' });
    }
  }
];