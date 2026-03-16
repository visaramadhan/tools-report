import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Loan from '@/models/Loan';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();
  try {
    const loan = await Loan.findById(id);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    return NextResponse.json(loan);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 });
  }
}

