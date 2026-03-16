import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    if (!email || !password) {
      return mobileJson(req, { error: 'Missing credentials' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user || user.status === false) {
      return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.password) {
      return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });

    const token = await signMobileToken({
      sub: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return mobileJson(req, {
      token,
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return mobileJson(req, { error: 'Login failed' }, { status: 500 });
  }
}
