import mongoose, { Schema, Model } from 'mongoose';

export interface ISetting {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  footerText?: string;
  emailManagement?: string;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>({
  companyName: { type: String, default: 'My Company' },
  logoUrl: { type: String },
  primaryColor: { type: String, default: '#3b82f6' }, // blue-500
  footerText: { type: String },
  emailManagement: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const Setting: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

export default Setting;
