import mongoose, { Schema, Model } from 'mongoose';

export interface ITool {
  toolCode: string;
  name: string;
  category: string;
  subCategory: string;
  subCategoryPrefix: string;
  year: number;
  description?: string;
  photoUrl?: string;
  condition?: 'Good' | 'Bad';
  lastCheckedAt?: Date;
  createdDate: Date;
  status: boolean; // Active/Inactive
  isBorrowed: boolean;
  currentBorrowerId?: mongoose.Types.ObjectId;
  currentBorrowerName?: string;
  currentLoanId?: mongoose.Types.ObjectId;
  isReservedForReplacement?: boolean;
  reservedReplacementId?: mongoose.Types.ObjectId;
  isSingleUse?: boolean;
  isSpecial?: boolean;
}

const ToolSchema = new Schema<ITool>({
  toolCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  subCategoryPrefix: { type: String, required: true },
  year: { type: Number, required: true, default: () => new Date().getFullYear() },
  description: { type: String },
  photoUrl: { type: String },
  condition: { type: String, enum: ['Good', 'Bad'], default: 'Good' },
  lastCheckedAt: { type: Date, default: Date.now },
  createdDate: { type: Date, default: Date.now },
  status: { type: Boolean, default: true },
  isBorrowed: { type: Boolean, default: false },
  currentBorrowerId: { type: Schema.Types.ObjectId, ref: 'User' },
  currentBorrowerName: { type: String },
  currentLoanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
  isReservedForReplacement: { type: Boolean, default: false },
  reservedReplacementId: { type: Schema.Types.ObjectId, ref: 'Replacement' },
  isSingleUse: { type: Boolean, default: false },
  isSpecial: { type: Boolean, default: false },
});

const Tool: Model<ITool> = mongoose.models.Tool || mongoose.model<ITool>('Tool', ToolSchema);

export default Tool;
