import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import mongoose from 'mongoose';

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
    const meId = new mongoose.Types.ObjectId(payload.sub);
    const users = await User.find(
      { role: 'technician', status: true, _id: { $ne: meId } },
      { _id: 1, name: 1, email: 1 }
    ).sort({ name: 1 });
    return mobileJson(
      req,
      users.map((u: any) => ({ id: String(u._id), name: u.name, email: u.email }))
    );
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

