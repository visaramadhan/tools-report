import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import SubCategory from '@/models/SubCategory';
import { getBearerToken, verifyMobileToken } from '@/lib/mobileAuth';
import { mobileJson, mobileOptions } from '@/lib/mobileCors';
import { readFormData } from '@/lib/formData';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

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
    const available = searchParams.get('available');
    const search = searchParams.get('search');

    const query: any = {};
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { toolCode: { $regex: search, $options: 'i' } }];
    }
    if (available === 'true') {
      query.status = true;
      query.isBorrowed = { $ne: true };
      query.isReservedForReplacement = { $ne: true };
    }

    const tools = await Tool.find(query).sort({ createdDate: -1 }).limit(300);
    return mobileJson(req, tools);
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
    const formData = await readFormData(req);
    const categoryName = formData.get('category') as string;
    const subCategoryName = formData.get('subCategory') as string;
    const year = parseInt(formData.get('year') as string);
    const description = (formData.get('description') as string) || '';
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const status = formData.get('status') === 'true';
    const file = formData.get('photo') as File | null;

    if (!categoryName || !subCategoryName || !year) {
      return mobileJson(req, { error: 'Missing required fields' }, { status: 400 });
    }

    const subCategory = await SubCategory.findOne({ name: subCategoryName, categoryName });
    if (!subCategory) return mobileJson(req, { error: 'Subcategory not found' }, { status: 400 });

    const count = await Tool.countDocuments({ subCategory: subCategoryName, year });
    const sequence = (count + 1).toString().padStart(3, '0');
    const toolCode = `${subCategory.prefix}-${year}-${sequence}`;
    const displayName = `${subCategoryName} ${sequence}`;

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `tool-${Date.now()}-${file.name.replace(/\\s/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public/uploads');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const tool = await Tool.create({
      toolCode,
      name: displayName,
      category: categoryName,
      subCategory: subCategoryName,
      subCategoryPrefix: subCategory.prefix,
      year,
      description,
      condition,
      photoUrl,
      status,
      lastCheckedAt: new Date(),
    });

    return mobileJson(req, tool, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return mobileJson(req, { error: 'Failed to create tool', detail }, { status: 500 });
  }
}
