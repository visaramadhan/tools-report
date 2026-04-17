import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  try {
    const users = await User.find({ role: 'technician', status: true }).select({ _id: 1, name: 1 }).sort({ name: 1 }).lean();
    const filtered = users.filter((u: any) => String(u._id) !== session.user.id);
    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 });
  }
}

