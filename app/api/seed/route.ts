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
    let adminCreated = false;
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: true,
      });
      adminCreated = true;
    }

    const extraRaw = process.env.SEED_EXTRA_USERS || '';
    const extraCreated: string[] = [];
    const extraSkipped: string[] = [];
    if (extraRaw) {
      let users: any[] = [];
      try {
        users = JSON.parse(extraRaw);
      } catch {
        return NextResponse.json({ error: 'Invalid SEED_EXTRA_USERS JSON' }, { status: 400 });
      }

      if (!Array.isArray(users)) {
        return NextResponse.json({ error: 'SEED_EXTRA_USERS must be a JSON array' }, { status: 400 });
      }

      for (const u of users) {
        const email = String(u?.email || '').toLowerCase().trim();
        const password = String(u?.password || '');
        const name = String(u?.name || email || 'User');
        const role = u?.role === 'admin' ? 'admin' : 'technician';
        const status = u?.status === false ? false : true;
        if (!email || !password) continue;

        const exists = await User.findOne({ email });
        if (exists) {
          extraSkipped.push(email);
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashedPassword, role, status });
        extraCreated.push(email);
      }
    }

    return NextResponse.json({
      message: adminCreated ? 'Seeded' : 'Seeded (admin already exists)',
      adminEmail,
      adminCreated,
      extraCreated,
      extraSkipped,
    });
  } catch (error) {
    console.error('Seed error:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Seed failed', detail },
      { status: 500 }
    );
  }
}
