import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SubCategory from '@/models/SubCategory';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();
  try {
    await SubCategory.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Subcategory deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 });
  }
}
