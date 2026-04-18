import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubCategory from '@/models/SubCategory';
import Category from '@/models/Category';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  
  const query: any = {};
  if (categoryId) query.categoryId = categoryId;

  try {
    const subCategories = await SubCategory.find(query).sort({ name: 1 });
    return NextResponse.json(subCategories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  try {
    const body = await req.json();
    const { name, prefix, categoryId } = body;
    
    const category = await Category.findById(categoryId);
    if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    const subCategory = await SubCategory.create({
        name,
        prefix,
        categoryId,
        categoryName: category.name
    });
    return NextResponse.json(subCategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
  }
}
