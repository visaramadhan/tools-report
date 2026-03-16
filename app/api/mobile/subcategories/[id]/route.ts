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

    const body = (await req.json()) as {
      name?: string;
      prefix?: string;
      categoryId?: string;
      description?: string;
    };
    const update: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (typeof body.prefix === 'string' && body.prefix.trim()) update.prefix = body.prefix.trim().toUpperCase();
    if (typeof body.description === 'string') update.description = body.description;

    if (typeof body.categoryId === 'string' && body.categoryId.trim()) {
      const category = await Category.findById(body.categoryId);
      if (!category) return mobileJson(req, { error: 'Category not found' }, { status: 404 });
      update.categoryId = category._id;
      update.categoryName = category.name;
    }

    const sub = await SubCategory.findByIdAndUpdate(id, update, { new: true });
    if (!sub) return mobileJson(req, { error: 'Subcategory not found' }, { status: 404 });
    return mobileJson(req, sub);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to update subcategory', detail }, { status: 500 });
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
    await SubCategory.findByIdAndDelete(id);
    return mobileJson(req, { message: 'Subcategory deleted' });
  } catch {
    return mobileJson(req, { error: 'Failed to delete subcategory' }, { status: 500 });
  }
}

