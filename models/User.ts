import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'technician';
  photoUrl?: string;
  status: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for OAuth, but required for credentials
  role: { type: String, enum: ['admin', 'technician'], default: 'technician' },
  photoUrl: { type: String },
  status: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
