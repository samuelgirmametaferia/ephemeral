import cron from 'node-cron';
import pool from './db';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    // Delete expired sessions
    const deleteExpired = await pool.query(
      `DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );
    console.log(`Deleted ${deleteExpired.rowCount} expired sessions.`);

    // Delete sessions of users inactive for over 3 days
    const deleteSessions = await pool.query(`
      DELETE FROM sessions
      WHERE username IN (
        SELECT username FROM users WHERE last_used < NOW() - INTERVAL '3 days'
      )
    `);
    console.log(`Deleted ${deleteSessions.rowCount} sessions of inactive users.`);

    // Gather avatars for inactive users and delete both files and users
    const inactiveUsers = await pool.query(
      `SELECT username, avatar_url FROM users WHERE last_used < NOW() - INTERVAL '3 days'`
    );

    const avatarsDir = path.join(__dirname, '../uploads/avatars');
    for (const row of inactiveUsers.rows) {
      const avatarUrl = (row.avatar_url as string) || '';
      if (!avatarUrl) continue;
      try {
        const normalized = path.normalize(path.join(__dirname, '..', avatarUrl.replace(/^\/+/, '')));
        if (normalized.startsWith(avatarsDir)) {
          await fs.promises.unlink(normalized).catch(() => {});
          console.log('[cleanup] Deleted avatar for user', row.username, '->', normalized);
        } else {
          console.warn('[cleanup] Skipping unexpected avatar path for user', row.username, '->', normalized);
        }
      } catch (e) {
        console.warn('[cleanup] Failed to delete avatar for user', row.username, e);
      }
    }

    // Delete inactive users
    const deleteUsers = await pool.query(
      `DELETE FROM users WHERE last_used < NOW() - INTERVAL '3 days'`
    );
    console.log(`Deleted ${deleteUsers.rowCount} inactive users (last_used > 3 days ago).`);
  } catch (error) {
    console.error('Error deleting inactive users or sessions:', error);
  }
});