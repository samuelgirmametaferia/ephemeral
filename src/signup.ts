// MrKing2025
import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import pool from './db';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { GenerateSessionkey } from './usermanagement';
// rate limit
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  message: {
    success: false,
    message: 'Too many sign-up attempts. Please try again later.',
  },
});
function setSessionCookie(res: Response, sessionKey: string) {
  res.cookie('session', sessionKey, {
    httpOnly: true,
    secure: true, // only over HTTPS
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}
// hash
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const router = Router();

router.post('/', signupLimiter, async (req: Request, res: Response) => {
  const { username, password, handle } = req.body;
  // signup request
  console.log('Signup request received:', { username, handle, passwordProvided: !!password });

  if (!username || !handle) {
    // missing input
    console.log('Missing username or handle');
    return res.status(400).json({
      success: false,
      message: 'Username and handle are required.',
    });
  }

  try {
    // hash inputs (username only)
    const hashedUsername = sha256(username);
    const saltRounds = 10;
    const passwordHash = password ? await bcrypt.hash(password, saltRounds) : null;

    console.log('Hashed username:', hashedUsername);
    console.log('Plain handle (stored):', handle);
    console.log('Password hash generated:', !!passwordHash);

    // insert user (store handle unhashed/plaintext)
    await pool.query(
      `INSERT INTO users (username, password, handle)
       VALUES ($1, $2, $3)`,
      [hashedUsername, passwordHash, handle]
    );

    console.log('User successfully inserted');

    // after login success:
    const ipAddress = req.ip ?? '';
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || '';
    const sessionKey = GenerateSessionkey(ipAddress, hashedUsername);
    await pool.query(
      `INSERT INTO sessions (session_key, username, ip_address, user_agent, expires_at)
   VALUES ($1, $2, $3, $4, NOW() + interval '7 days')`,
      [sessionKey, hashedUsername, ipAddress, userAgent]
    );


    setSessionCookie(res, sessionKey);
    res.status(201).json({
      success: true,
      message: 'User created successfully.',
    });
  } catch (error: any) {
    console.error('Error during signup:', error);

    if (error.code === '23505') {
      // duplicate
      return res.status(409).json({
        success: false,
        message: 'Username or handle already exists.',
      });
    }

    // error
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      error: error.message, // remove in prod
    });
  }
});

export default router;