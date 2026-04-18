import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { normalizeMobileRole, signMobileToken } from '@/lib/mobileAuth';
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
    if (!user) {
      const totalUsers = await User.countDocuments();
      if (totalUsers === 0) {
        return mobileJson(req, { error: 'Belum ada user. Jalankan /api/seed untuk membuat admin pertama.', detail: { needSeed: true } }, { status: 409 });
      }
      return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });
    }
    if (user.status === false) {
      return mobileJson(req, { error: 'Akun nonaktif' }, { status: 403 });
    }
    if (!user.password) {
      return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return mobileJson(req, { error: 'Invalid credentials' }, { status: 401 });

    const role = normalizeMobileRole(String(user.role || ''));
    if (role !== 'admin' && role !== 'technician') {
      return mobileJson(req, { error: 'Role user tidak valid untuk mobile' }, { status: 403 });
    }

    const token = await signMobileToken({
      sub: String(user._id),
      role,
      name: user.name,
      email: user.email,
    });

    return mobileJson(req, {
      token,
      user: { id: String(user._id), name: user.name, email: user.email, role },
    });
  } catch {
    return mobileJson(req, { error: 'Login failed' }, { status: 500 });
  }
}
