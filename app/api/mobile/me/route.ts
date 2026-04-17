import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getBearerToken, normalizeMobileRole, signMobileToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    await dbConnect();
    const user = await User.findById(payload.sub, '-password');
    if (!user) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
    const role = normalizeMobileRole(String(user.role || payload.role || ''));
    const nextToken = role !== payload.role ? await signMobileToken({ sub: payload.sub, role, name: user.name, email: user.email }) : undefined;
    return mobileJson(req, { user: { id: String(user._id), name: user.name, email: user.email, role }, token: nextToken });
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}
