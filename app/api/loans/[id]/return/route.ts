import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import Loan from '@/models/Loan';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import { readFormData } from '@/lib/formData';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  try {
    const formData = await readFormData(req);
    const toolId = formData.get('toolId');
    const condition = formData.get('condition');
    const description = formData.get('description');
    const file = formData.get('photo') as File | null;

    if (typeof toolId !== 'string' || typeof condition !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (toolId === 'undefined' || toolId === 'null') {
      return NextResponse.json({ error: 'Invalid toolId' }, { status: 400 });
    }
    if (condition !== 'Good' && condition !== 'Bad') {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
    }

    const loan = await Loan.findById(id);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const itemIndex = loan.items.findIndex((it) => String(it.toolId) === toolId);
    if (itemIndex < 0) return NextResponse.json({ error: 'Tool not in loan' }, { status: 400 });
    if (loan.items[itemIndex]?.returnedAt) {
      return NextResponse.json({ error: 'Tool already returned' }, { status: 400 });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `return-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const now = new Date();
    loan.items[itemIndex] = {
      ...loan.items[itemIndex],
      returnedAt: now,
      returnCondition: condition,
      returnDescription: typeof description === 'string' ? description : '',
      returnPhotoUrl: photoUrl || undefined,
    };

    const remaining = loan.items.filter((it) => !it.returnedAt).length;
    loan.status = remaining === 0 ? 'Returned' : 'PartiallyReturned';
    loan.returnedAt = remaining === 0 ? now : undefined;
    await loan.save();

    await Tool.findByIdAndUpdate(tool._id, {
      $set: {
        isBorrowed: false,
        currentBorrowerId: null,
        currentBorrowerName: null,
        currentLoanId: null,
        condition,
        lastCheckedAt: now,
      },
    });

    await Report.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      technicianId: loan.borrowerId,
      technicianName: loan.borrowerName,
      condition,
      description: typeof description === 'string' ? description : '',
      photoUrl,
    });

    return NextResponse.json({ message: 'Returned', loan });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    const name = error instanceof Error ? error.name : 'Error';
    console.error('Return tool error:', error);
    return NextResponse.json({ error: 'Failed to return tool', name, detail }, { status: 500 });
  }
}
