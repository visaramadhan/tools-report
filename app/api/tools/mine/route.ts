import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Tool from '@/models/Tool';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  try {
    const tools = await Tool.find({
      status: true,
      isBorrowed: true,
      currentBorrowerId: session.user.id,
    }).sort({ createdDate: -1 });
    return NextResponse.json(tools);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

