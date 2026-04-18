import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Setting from '@/models/Setting';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  await dbConnect();
  try {
    const setting = await Setting.findOne({});
    if (!setting) {
        // Return defaults if not found
        return NextResponse.json({
            companyName: 'My Company',
            primaryColor: '#3b82f6',
        });
    }
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  try {
    const body = await req.json();
    const setting = await Setting.findOneAndUpdate({}, body, { new: true, upsert: true });
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
