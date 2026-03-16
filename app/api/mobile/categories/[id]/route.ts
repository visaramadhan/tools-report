import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const body = (await req.json()) as { name?: string; description?: string };
    const update: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (typeof body.description === 'string') update.description = body.description;

    const category = await Category.findByIdAndUpdate(id, update, { new: true });
    if (!category) return mobileJson(req, { error: 'Category not found' }, { status: 404 });
    return mobileJson(req, category);
  } catch {
    return mobileJson(req, { error: 'Failed to update category' }, { status: 500 });
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

    const category = await Category.findById(id);
    if (!category) return mobileJson(req, { error: 'Category not found' }, { status: 404 });
    const hasSub = await SubCategory.findOne({ categoryId: category._id });
    if (hasSub) return mobileJson(req, { error: 'Cannot delete category with subcategories' }, { status: 400 });
    await Category.findByIdAndDelete(id);
    return mobileJson(req, { message: 'Category deleted' });
  } catch {
    return mobileJson(req, { error: 'Failed to delete category' }, { status: 500 });
  }
}

