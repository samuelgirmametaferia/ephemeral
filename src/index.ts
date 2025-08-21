// MrKing2025
import { Request, RequestHandler, Response, NextFunction } from 'express';
import { checkUsernameAvailability, checkHandleAvailability } from './request';
import express from 'express';
import path from 'path';
import signupRouter from './signup';
import './cleanup';
import loginRouter from './login';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { validateSession } from './sessionmanger';
import { logoutRequest } from './logout';
import { handleObjectRequest } from './tools';
import { postRoutes } from './postRoutes';
import { uploadRouter } from './uploadRoutes';
import { feedRoutes } from './feed';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });


const app = express();
const PORT = Number(process.env.PORT || 4000);
const DATA_SERVER_ORIGIN = process.env.DATA_SERVER_ORIGIN || 'http://localhost:5000';

// Convert BigInt values to strings in all JSON responses
app.set('json replacer', (_key: string, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", DATA_SERVER_ORIGIN],
        imgSrc: ["'self'", "data:", "blob:", DATA_SERVER_ORIGIN],
        mediaSrc: ["'self'", "data:", "blob:", DATA_SERVER_ORIGIN],
        // If you have inline scripts in your HTML, add "'unsafe-inline'" or switch to nonces
        scriptSrc: ["'self'"], // add "'unsafe-inline'" if needed
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', false);

// Static files (serves uploaded media from /uploads)
app.use(express.static(path.join(__dirname, '../public')));
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    immutable: true,
    maxAge: '7d',
  })
);

// Main page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// Checks
app.get('/check-username', checkUsernameAvailability);
app.get('/check-handle', checkHandleAvailability);

// Session validation
app.get('/validate-session', validateSession);

// Auth
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Profile
app.all('/profile', handleObjectRequest('profile'));

// Logout
app.post('/logout', logoutRequest as unknown as RequestHandler);

// Core APIs
app.use('/api', postRoutes);
app.use('/api/upload', uploadRouter); // same-origin upload
app.use('/api', feedRoutes); // feed endpoints

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Uploads available at /api/upload/post and served from /uploads`);
  console.log('POSTING_BYPASS_ENABLE=', process.env.POSTING_BYPASS_ENABLE, 'NODE_ENV=', process.env.NODE_ENV);
});