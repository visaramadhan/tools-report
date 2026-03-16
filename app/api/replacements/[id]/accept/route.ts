import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Replacement, { ReplacementStatus } from '@/models/Replacement';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await dbConnect();
  try {
    const repl = await Replacement.findById(id);
    if (!repl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (String(repl.requesterId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (repl.status !== 'Shipped') {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }
    // User acknowledges receipt
    repl.status = 'ReplacementReceived' as ReplacementStatus;
    repl.replacementReceivedAt = new Date();
    await repl.save();
    return NextResponse.json(repl);
  } catch {
    return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });
  }
}
