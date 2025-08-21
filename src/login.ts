// MrKing2025
import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import pool from './db';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { GenerateSessionkey } from './usermanagement'; // adjust path if needed

const isProd = process.env.NODE_ENV === 'production';

// rate limit
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

function setSessionCookie(res: Response, sessionKey: string) {
  res.cookie('session', sessionKey, {
    httpOnly: true,
    secure: isProd, // only over HTTPS in production
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// hash
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const router = Router();

router.post('/', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // login request
  console.log('Login request received:', { username, passwordProvided: !!password });

  if (!username || !password) {
    // missing input
    console.log('Missing username or password');
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.',
    });
  }

  try {
    // Generate session key
    const ipAddress = req.ip ?? '';
    const sessionKey = GenerateSessionkey(ipAddress, username);
    // hash username
    const hashedUsername = sha256(username);
    console.log('Hashed username:', hashedUsername);

    // get user (by hashed username)
    const result = await pool.query(
      `SELECT password, handle FROM users WHERE username = $1`,
      [hashedUsername]
    );

    if (result.rowCount === 0) {
      // not found
      console.log('User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // check password
    const { password: hashedPassword, handle: plainHandle } = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      // wrong password
      console.log('Password mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }
    // Update last_used timestamp
    await pool.query(
      `UPDATE users SET last_used = NOW() WHERE username = $1`,
      [hashedUsername]
    );
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : req.headers['user-agent'] || '';
    await pool.query(
      `INSERT INTO sessions (session_key, username, ip_address, user_agent, expires_at)
   VALUES ($1, $2, $3, $4, NOW() + interval '7 days')
   ON CONFLICT (username)
   DO UPDATE SET
     session_key = EXCLUDED.session_key,
     ip_address = EXCLUDED.ip_address,
     user_agent = EXCLUDED.user_agent,
     expires_at = EXCLUDED.expires_at
  `,
      [sessionKey, hashedUsername, ipAddress, userAgent]
    );


    // Set session cookie
    setSessionCookie(res, sessionKey);
    // ok
    console.log('Login successful for user:', username);

    res.json({
      success: true,
      message: 'Login successful.',
      handle: plainHandle, // available for client if needed
    });
  } catch (error: any) {
    // error
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      error: error.message, // remove in prod
    });
  }
});


export default router;