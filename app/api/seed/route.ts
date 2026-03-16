import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();

    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      return NextResponse.json({ message: 'Admin already exists', email: adminEmail });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: 'Admin User',
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
