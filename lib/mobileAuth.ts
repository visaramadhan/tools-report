import { jwtVerify, SignJWT } from 'jose';

type MobileTokenPayload = {
  sub: string;
  role: string;
  name?: string;
  email?: string;
};

export function normalizeMobileRole(input: string) {
  const value = String(input || '').toLowerCase().trim();
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (value === 'technician' || value === 'teknisi' || value === 'tech') return 'technician';
  return value;
}

function getSecret() {
  const raw = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!raw) throw new Error('Missing AUTH_SECRET');
  return new TextEncoder().encode(raw);
}

export async function signMobileToken(payload: MobileTokenPayload) {
  const secret = getSecret();
  const role = normalizeMobileRole(payload.role);
  if (role !== 'admin' && role !== 'technician') {
    throw new Error('Invalid mobile role');
  }
  return new SignJWT({ role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyMobileToken(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const role = normalizeMobileRole(typeof payload.role === 'string' ? payload.role : '');
  const name = typeof payload.name === 'string' ? payload.name : undefined;
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  if (!sub || (role !== 'admin' && role !== 'technician')) throw new Error('Invalid token');
  return { sub, role, name, email };
}

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader) return '';
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return '';
  return token.trim();
}
