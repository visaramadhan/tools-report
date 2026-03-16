import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { auth } from '@/auth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  try {
    const { id } = await params;
    const tool = await Tool.findById(id);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    return NextResponse.json(tool);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tool' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let updateData: any = {};
    const currentTool = await Tool.findById(id);
    if (!currentTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await readFormData(req);
      updateData.category = formData.get('category') as string;
      updateData.subCategory = formData.get('subCategory') as string;
      updateData.year = formData.get('year') ? parseInt(formData.get('year') as string) : undefined;
      updateData.description = formData.get('description') as string;
      updateData.condition = formData.get('condition') as 'Good' | 'Bad';
      updateData.status = formData.get('status') === 'true';
      const file = formData.get('photo') as File | null;
      
      if (file && file.size > 0) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          const filename = `tool-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
          const uploadDir = path.join(process.cwd(), 'public/uploads');
          const filepath = path.join(uploadDir, filename);
          await mkdir(uploadDir, { recursive: true });
          await writeFile(filepath, buffer);
          updateData.photoUrl = `/uploads/${filename}`;
      }
      
      // If condition changed, update lastCheckedAt
      if (currentTool.condition !== updateData.condition) updateData.lastCheckedAt = new Date();
      
    } else {
      // Fallback for JSON requests (legacy support if needed)
      updateData = await req.json();
    }

    const toolCode = currentTool.toolCode || '';
    const index = toolCode.split('-').pop() || '';
    const subCategoryName = updateData.subCategory || currentTool.subCategory;
    if (subCategoryName && index) {
      updateData.name = `${subCategoryName} ${index}`;
    }
    delete updateData.toolCode;

    // Reset isReservedForReplacement when updating tool status
    if (currentTool.status !== updateData.status) {
      updateData.isReservedForReplacement = false;
    }

    const tool = await Tool.findByIdAndUpdate(id, updateData, { new: true });
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    return NextResponse.json(tool);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();
  try {
    await Tool.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Tool deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
