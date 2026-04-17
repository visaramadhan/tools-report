import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tool from '@/models/Tool';
import SubCategory from '@/models/SubCategory';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { readFormData } from '@/lib/formData';

export async function GET(req: Request) {
  await dbConnect();
  
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'createdDate';
  const order = searchParams.get('order') === 'asc' ? 1 : -1;
  const available = searchParams.get('available');

  const query: any = {};
  if (category) query.category = category;
  if (search) {
      query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { toolCode: { $regex: search, $options: 'i' } }
      ];
  }
  if (available === 'true') {
    query.status = true;
    query.condition = { $ne: 'Bad' };
    query.isBorrowed = { $ne: true };
    query.isReservedForReplacement = { $ne: true };
  }

  try {
    const tools = await Tool.find(query).sort({ [sort]: order });
    return NextResponse.json(tools);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  try {
    const formData = await readFormData(req);
    const categoryName = formData.get('category') as string;
    const subCategoryName = formData.get('subCategory') as string;
    const year = parseInt(formData.get('year') as string);
    const description = formData.get('description') as string;
    const condition = formData.get('condition') as 'Good' | 'Bad';
    const status = formData.get('status') === 'true';
    const file = formData.get('photo') as File | null;

    if (!categoryName || !subCategoryName || !year) {
         return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Tool Code
    const subCategory = await SubCategory.findOne({ name: subCategoryName, categoryName });
    if (!subCategory) {
        return NextResponse.json({ error: 'Subcategory not found' }, { status: 400 });
    }

    // Count existing tools in this subcategory + year to generate sequence
    const count = await Tool.countDocuments({ subCategory: subCategoryName, year });
    const sequence = (count + 1).toString().padStart(3, '0');
    // Format: PREFIX-YEAR-SEQUENCE (e.g., APD-2026-001)
    const toolCode = `${subCategory.prefix}-${year}-${sequence}`;
    const displayName = `${subCategoryName} ${sequence}`;

    let photoUrl = '';
    if (file && file.size > 0 && file.name !== 'undefined') {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const filename = `tool-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        
        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        const filepath = path.join(uploadDir, filename);
        
        await writeFile(filepath, buffer);
        photoUrl = `/uploads/${filename}`;
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
      }
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

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    console.error('Create tool failed:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}
