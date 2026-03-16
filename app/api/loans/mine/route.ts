import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Loan from '@/models/Loan';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  try {
    const loans = await Loan.find({ borrowerId: session.user.id, status: { $in: ['Borrowed', 'PartiallyReturned'] } })
      .sort({ borrowedAt: -1 })
      .limit(100);
    return NextResponse.json(loans);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

