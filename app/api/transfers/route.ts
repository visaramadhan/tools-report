import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Transfer from '@/models/Transfer';
import Tool from '@/models/Tool';
import User from '@/models/User';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const query: any = {};
    if (session.user.role !== 'admin') {
      if (type === 'incoming') query.toTechnicianId = session.user.id;
      else if (type === 'outgoing') query.fromTechnicianId = session.user.id;
      else query.$or = [{ fromTechnicianId: session.user.id }, { toTechnicianId: session.user.id }];
    } else if (type === 'incoming') {
      query.status = 'Pending';
    }

    if (status) query.status = status;

    const transfers = await Transfer.find(query).sort({ updatedAt: -1 }).limit(200).lean();
    return NextResponse.json(transfers);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();

  try {
    const formData = await readFormData(req);
    const toolId = formData.get('toolId');
    const toTechnicianId = formData.get('toTechnicianId');
    const conditionRaw = formData.get('condition');
    const descriptionRaw = formData.get('description');
    const file = formData.get('photo') as File | null;

    if (typeof toolId !== 'string' || typeof toTechnicianId !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (conditionRaw !== 'Good' && conditionRaw !== 'Bad') {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    if (!tool.isBorrowed || String(tool.currentBorrowerId || '') !== session.user.id) {
      return NextResponse.json({ error: 'Tools tidak sedang dipinjam oleh anda' }, { status: 400 });
    }

    const toUser = await User.findById(toTechnicianId);
    if (!toUser || toUser.role !== 'technician' || !toUser.status) {
      return NextResponse.json({ error: 'Teknisi tujuan tidak valid' }, { status: 400 });
    }

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `transfer-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const transfer = await Transfer.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      fromTechnicianId: session.user.id,
      fromTechnicianName: session.user.name || 'Unknown',
      toTechnicianId: toUser._id,
      toTechnicianName: toUser.name,
      fromLoanId: tool.currentLoanId || undefined,
      condition: conditionRaw,
      description: typeof descriptionRaw === 'string' ? descriptionRaw : '',
      photoUrl: photoUrl || undefined,
      status: 'Pending',
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create transfer', detail }, { status: 500 });
  }
}

