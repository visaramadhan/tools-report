import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || '';
    const expectedKey = process.env.SEED_KEY || '';
    if (!expectedKey || key !== expectedKey) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.SEED_ADMIN_NAME || 'Admin User';

    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      return NextResponse.json({ message: 'Admin already exists', email: adminEmail });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      status: true,
    });

    return NextResponse.json({ message: 'Admin created', email: adminEmail });
  } catch (error) {
    console.error('Seed error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Seed failed', detail },
      { status: 500 }
    );
  }
}
