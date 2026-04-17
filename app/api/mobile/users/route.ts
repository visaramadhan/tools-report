import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (status === 'true') query.status = true;
    if (status === 'false') query.status = false;

    const users = await User.find(query, '-password').sort({ createdAt: -1 });
    return mobileJson(req, users);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const body = (await req.json()) as { name?: string; email?: string; password?: string; role?: string };
    const name = (body.name || '').trim();
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    const role = body.role === 'admin' ? 'admin' : 'technician';
    if (!name || !email || !password) {
      return mobileJson(req, { error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) return mobileJson(req, { error: 'User already exists' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status: true,
    });
    return mobileJson(req, { id: String(user._id) }, { status: 201 });
  } catch {
    return mobileJson(req, { error: 'Failed to create user' }, { status: 500 });
  }
}

