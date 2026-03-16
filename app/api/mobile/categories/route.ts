import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
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
    const categories = await Category.find({}).sort({ createdAt: -1 });
    return mobileJson(req, categories);
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

    const body = (await req.json()) as { name?: string; description?: string };
    const name = (body.name || '').trim();
    const description = typeof body.description === 'string' ? body.description : '';
    if (!name) return mobileJson(req, { error: 'Name required' }, { status: 400 });

    const exists = await Category.findOne({ name });
    if (exists) return mobileJson(req, { error: 'Category already exists' }, { status: 400 });

    const category = await Category.create({ name, description });
    return mobileJson(req, category, { status: 201 });
  } catch {
    return mobileJson(req, { error: 'Failed to create category' }, { status: 500 });
  }
}

