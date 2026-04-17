import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { auth } from '@/auth';
import Tool from '@/models/Tool';
import Report from '@/models/Report';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';
import { sendReportEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  try {
    const tool = await Tool.findById(id);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    const formData = await readFormData(req);
    const conditionRaw = formData.get('condition');
    const descriptionRaw = formData.get('description');
    const file = formData.get('photo') as File | null;

    const condition = conditionRaw === 'Bad' ? 'Bad' : 'Good';
    const description = typeof descriptionRaw === 'string' ? descriptionRaw : '';

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `repair-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const now = new Date();
    tool.condition = condition;
    tool.status = condition === 'Good';
    tool.lastCheckedAt = now;
    await tool.save();

    const report = await Report.create({
      toolId: tool._id,
      toolCode: tool.toolCode,
      toolName: tool.name,
      category: tool.category,
      subCategory: tool.subCategory,
      technicianId: session.user.id,
      technicianName: session.user.name || 'Admin',
      examinerName: session.user.name || 'Admin',
      condition,
      description,
      photoUrl: photoUrl || undefined,
    });
    await sendReportEmail(report);

    return NextResponse.json({ tool });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to repair', detail }, { status: 500 });
  }
}
