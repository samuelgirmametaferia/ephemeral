import { createHmac, randomBytes } from 'crypto';
import * as CryptoJS from 'crypto-js';
import net from 'net';
let secretKey = process.env.SECRET_KEY || "@mrKing";
let secretKey2 = process.env.SECRET_KEY || "@kingMr";

function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function decryptData(encryptedData: string, key: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
}
export function GenerateSessionkey(ipaddress: string, handle: string) {
  const salt = randomBytes(16).toString('hex');
  const hmac = createHmac('sha256', secretKey);
  hmac.update(ipaddress + handle + salt);
  const handleSection = encryptData(handle, secretKey2);
  return `${hmac.digest('hex')}|${handleSection}|${salt}|${ipaddress}`;
}


// usermanagement.ts
export function validateSessionKey(sessionKey: string): { handle: string, originalIp: string, salt: string } | null {
  const parts = sessionKey.split('|');
  if (parts.length !== 4) return null;

  const [receivedHash, encryptedHandle, salt, originalIp] = parts;

  const handle = decryptData(encryptedHandle, secretKey2);
  if (!handle) return null;

  const hmac = createHmac('sha256', secretKey);
  hmac.update(originalIp + handle + salt);
  const expectedHash = hmac.digest('hex');

  if (expectedHash === receivedHash) {
    return { handle, originalIp, salt };
  }

  return null;
}


function compareSoftIp(ip1: string, ip2: string): boolean {
  if (!ip1 || !ip2) return false;

  const normalize = (ip: string) => {
    // Remove extra spaces
    ip = ip.trim();
    // Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    return ip;
  };

  ip1 = normalize(ip1);
  ip2 = normalize(ip2);

  // If either isn't a valid IP, fail
  if (net.isIP(ip1) === 0 || net.isIP(ip2) === 0) return false;

  const parts1 = ip1.split('.');
  const parts2 = ip2.split('.');

  if (parts1.length === 4 && parts2.length === 4) {
    // IPv4: Compare first two octets
    return parts1[0] === parts2[0] && parts1[1] === parts2[1];
  }

  // IPv6: Compare first two hextets
  const hex1 = ip1.split(':');
  const hex2 = ip2.split(':');
  return hex1[0] === hex2[0] && hex1[1] === hex2[1];
}