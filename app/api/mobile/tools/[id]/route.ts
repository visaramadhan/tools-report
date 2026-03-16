import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { readFormData } from '@/lib/formData';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    const tool = await Tool.findById(id);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    return mobileJson(req, tool);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const currentTool = await Tool.findById(id);
    if (!currentTool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });

    const contentType = req.headers.get('content-type') || '';
    const updateData: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await readFormData(req);
      const category = formData.get('category');
      const subCategory = formData.get('subCategory');
      const yearRaw = formData.get('year');
      const description = formData.get('description');
      const condition = formData.get('condition');
      const status = formData.get('status');
      const file = formData.get('photo') as File | null;

      if (typeof category === 'string') updateData.category = category;
      if (typeof subCategory === 'string') updateData.subCategory = subCategory;
      if (typeof yearRaw === 'string' && yearRaw) updateData.year = parseInt(yearRaw);
      if (typeof description === 'string') updateData.description = description;
      if (condition === 'Good' || condition === 'Bad') updateData.condition = condition;
      if (typeof status === 'string') updateData.status = status === 'true';

      if (file && file.size > 0 && file.name !== 'undefined') {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `tool-${Date.now()}-${file.name.replace(/\\s/g, '_')}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);
        updateData.photoUrl = `/uploads/${filename}`;
      }

      if (typeof updateData.condition === 'string' && currentTool.condition !== updateData.condition) {
        updateData.lastCheckedAt = new Date();
      }
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      Object.assign(updateData, body);
    }

    const toolCode = currentTool.toolCode || '';
    const index = toolCode.split('-').pop() || '';
    const subCategoryName = (updateData.subCategory as string) || currentTool.subCategory;
    if (subCategoryName && index) {
      updateData.name = `${subCategoryName} ${index}`;
    }
    delete (updateData as any).toolCode;

    const tool = await Tool.findByIdAndUpdate(id, updateData, { new: true });
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    return mobileJson(req, tool);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to update tool', detail }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();
    await Tool.findByIdAndDelete(id);
    return mobileJson(req, { message: 'Tool deleted' });
  } catch {
    return mobileJson(req, { error: 'Failed to delete tool' }, { status: 500 });
  }
}

