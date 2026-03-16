import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const user = await User.findById(id, '-password');
    if (!user) return mobileJson(req, { error: 'User not found' }, { status: 404 });
    return mobileJson(req, user);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });

    await dbConnect();
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      status?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string') updateData.name = body.name.trim();
    if (typeof body.email === 'string') updateData.email = body.email.toLowerCase().trim();
    if (body.role === 'admin' || body.role === 'technician') updateData.role = body.role;
    if (typeof body.status === 'boolean') updateData.status = body.status;

    if (typeof body.password === 'string' && body.password.trim()) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, select: '-password' });
    if (!user) return mobileJson(req, { error: 'User not found' }, { status: 404 });
    return mobileJson(req, user);
  } catch {
    return mobileJson(req, { error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    await User.findByIdAndDelete(id);
    return mobileJson(req, { message: 'User deleted' });
  } catch {
    return mobileJson(req, { error: 'Failed to delete user' }, { status: 500 });
  }
}

