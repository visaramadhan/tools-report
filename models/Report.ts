import mongoose, { Schema, Model } from 'mongoose';

export interface IReport {
  toolId: mongoose.Types.ObjectId;
  toolCode?: string;
  toolName: string;
  category?: string;
  subCategory?: string;
  technicianId: mongoose.Types.ObjectId;
  technicianName: string;
  examinerName?: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
  replacementId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  toolId: { type: Schema.Types.ObjectId, ref: 'Tool', required: true },
  toolCode: { type: String },
  toolName: { type: String, required: true },
  category: { type: String },
  subCategory: { type: String },
  technicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  technicianName: { type: String, required: true },
  examinerName: { type: String },
  condition: { type: String, enum: ['Good', 'Bad'], required: true },
  description: { type: String },
  photoUrl: { type: String },
  photoUrls: [{ type: String }],
  replacementId: { type: Schema.Types.ObjectId, ref: 'Replacement' },
  createdAt: { type: Date, default: Date.now },
});

const Report: Model<IReport> = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
