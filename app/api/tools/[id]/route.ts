import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import { auth } from '@/auth';
import { readFormData } from '@/lib/formData';
import { sendSystemEmail } from '@/lib/email';
import { uploadFileToGridFs } from '@/lib/uploads';

export const runtime = 'nodejs';

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
          const uploaded = await uploadFileToGridFs(file, 'tool');
          updateData.photoUrl = uploaded.url;
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
    const tool = await Tool.findById(id);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    await Tool.findByIdAndDelete(id);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const photoUrl = tool.photoUrl ? `${baseUrl}${String(tool.photoUrl).startsWith('/') ? tool.photoUrl : `/${tool.photoUrl}`}` : '';
    await sendSystemEmail({
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
            <tr><td style="padding: 6px 0; color:#666;"><strong>Dihapus oleh</strong></td><td style="padding: 6px 0;">: ${session.user.name || 'Admin'}</td></tr>
          </table>
          ${photoUrl ? `<div style="margin-top: 14px;"><p style="color:#666; margin-bottom: 8px;"><strong>Foto</strong></p><img src="${photoUrl}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" /></div>` : ''}
          <div style="margin-top: 22px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">Notifikasi otomatis sistem</div>
        </div>
      `,
    });
    return NextResponse.json({ message: 'Tool deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
