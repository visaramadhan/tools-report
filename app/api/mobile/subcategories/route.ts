import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return mobileOptions(req);
}

export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = await verifyMobileToken(token);
    if (payload.role !== 'admin') return mobileJson(req, { error: 'Forbidden' }, { status: 403 });
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName');
    const query: any = {};
    if (categoryId) query.categoryId = categoryId;
    if (categoryName) query.categoryName = categoryName;

    const subcategories = await SubCategory.find(query).sort({ createdAt: -1 });
    return mobileJson(req, subcategories);
  } catch {
    return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (!token) return mobileJson(req, { error: 'Unauthorized' }, { status: 401 });
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
    const name = (body.name || '').trim();
    const prefix = (body.prefix || '').trim().toUpperCase();
    const categoryId = body.categoryId || '';
    const description = typeof body.description === 'string' ? body.description : '';
    if (!name || !prefix || !categoryId) return mobileJson(req, { error: 'Missing required fields' }, { status: 400 });

    const category = await Category.findById(categoryId);
    if (!category) return mobileJson(req, { error: 'Category not found' }, { status: 404 });

    const sub = await SubCategory.create({
      name,
      prefix,
      categoryId: category._id,
      categoryName: category.name,
      description,
    });
    return mobileJson(req, sub, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to create subcategory', detail }, { status: 500 });
  }
}

