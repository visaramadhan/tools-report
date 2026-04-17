import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { sendSystemEmail } from '@/lib/email';
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
      const isSingleUse = formData.get('isSingleUse');
      const isSpecial = formData.get('isSpecial');
      const file = formData.get('photo') as File | null;

      if (typeof category === 'string') updateData.category = category;
      if (typeof subCategory === 'string') updateData.subCategory = subCategory;
      if (typeof yearRaw === 'string' && yearRaw) updateData.year = parseInt(yearRaw);
      if (typeof description === 'string') updateData.description = description;
      if (condition === 'Good' || condition === 'Bad') updateData.condition = condition;
      if (typeof status === 'string') updateData.status = status === 'true';
      if (typeof isSingleUse === 'string') updateData.isSingleUse = isSingleUse === 'true';
      if (typeof isSpecial === 'string') updateData.isSpecial = isSpecial === 'true';

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
    const tool = await Tool.findById(id);
    if (!tool) return mobileJson(req, { error: 'Tool not found' }, { status: 404 });
    await Tool.findByIdAndDelete(id);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const photoUrl = tool.photoUrl ? `${baseUrl}${String(tool.photoUrl).startsWith('/') ? tool.photoUrl : `/${tool.photoUrl}`}` : '';
    const emailStatus = await sendSystemEmail({
      subject: `[TOOLS] Deleted - ${tool.toolCode || ''} ${tool.name || ''}`.trim(),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color:#ef4444; border-bottom: 2px solid #eee; padding-bottom: 10px;">Tools Dihapus</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <tr><td style="padding: 6px 0; color:#666; width:150px;"><strong>Kode</strong></td><td style="padding: 6px 0;">: ${tool.toolCode || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Nama</strong></td><td style="padding: 6px 0;">: ${tool.name || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Kategori</strong></td><td style="padding: 6px 0;">: ${tool.category || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Sub Kategori</strong></td><td style="padding: 6px 0;">: ${tool.subCategory || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Kondisi</strong></td><td style="padding: 6px 0;">: ${tool.condition || '-'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Status</strong></td><td style="padding: 6px 0;">: ${tool.status === false ? 'Inactive' : 'Active'}</td></tr>
            <tr><td style="padding: 6px 0; color:#666;"><strong>Dihapus oleh</strong></td><td style="padding: 6px 0;">: ${payload.name || 'Admin'}</td></tr>
          </table>
          ${photoUrl ? `<div style="margin-top: 14px;"><p style="color:#666; margin-bottom: 8px;"><strong>Foto</strong></p><img src="${photoUrl}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" /></div>` : ''}
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    });
    return mobileJson(req, { message: 'Tool deleted', emailStatus });
  } catch {
    return mobileJson(req, { error: 'Failed to delete tool' }, { status: 500 });
  }
}
