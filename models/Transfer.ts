import mongoose, { Model, Schema } from 'mongoose';

export type TransferStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface ITransfer {
  toolId: mongoose.Types.ObjectId;
  toolCode: string;
  toolName: string;
  fromTechnicianId: mongoose.Types.ObjectId;
  fromTechnicianName: string;
  toTechnicianId: mongoose.Types.ObjectId;
  toTechnicianName: string;
  fromLoanId?: mongoose.Types.ObjectId;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  status: TransferStatus;
  acceptedAt?: Date;
  acceptedCondition?: 'Good' | 'Bad';
  acceptedDescription?: string;
  acceptedPhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    toolId: { type: Schema.Types.ObjectId, ref: 'Tool', required: true },
    toolCode: { type: String, required: true },
    toolName: { type: String, required: true },
    fromTechnicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromTechnicianName: { type: String, required: true },
    toTechnicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toTechnicianName: { type: String, required: true },
    fromLoanId: { type: Schema.Types.ObjectId, ref: 'Loan' },
    condition: { type: String, enum: ['Good', 'Bad'], required: true },
    description: { type: String },
    photoUrl: { type: String },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    acceptedAt: { type: Date },
    acceptedCondition: { type: String, enum: ['Good', 'Bad'] },
    acceptedDescription: { type: String },
    acceptedPhotoUrl: { type: String },
  },
  { timestamps: true }
);

TransferSchema.index({ status: 1, updatedAt: -1 });
TransferSchema.index({ toTechnicianId: 1, status: 1, createdAt: -1 });
TransferSchema.index({ fromTechnicianId: 1, status: 1, createdAt: -1 });

const Transfer: Model<ITransfer> = mongoose.models.Transfer || mongoose.model<ITransfer>('Transfer', TransferSchema);

export default Transfer;

