import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  try {
    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate if user exists first
    const user = await User.findOne({ email });
    if (!user) {
         return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: { name: string; password?: string } = { name };
    if (password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
        { email }, 
        updateData, 
        { new: true }
    );
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
        message: 'Profile updated', 
        user: { name: updatedUser.name, email: updatedUser.email } 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
