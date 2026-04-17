import mongoose, { Model, Schema } from 'mongoose';

export type LoanStatus = 'Borrowed' | 'Returned' | 'PartiallyReturned' | 'Exchanged';

export interface ILoanToolItem {
  toolId: mongoose.Types.ObjectId;
  toolCode: string;
  toolName: string;
  category: string;
  subCategory: string;
  borrowedAt: Date;
  borrowedCondition: 'Good' | 'Bad';
  borrowedPhotoUrl?: string;
  shipmentNote?: string;
  reportedCondition?: 'Good' | 'Bad';
  reportedAt?: Date;
  returnedAt?: Date;
  returnCondition?: 'Good' | 'Bad';
  returnDescription?: string;
  returnPhotoUrl?: string;
  returnShipmentRequestedAt?: Date;
  returnShipmentNote?: string;
  returnShipmentPhotoUrl?: string;
  returnReceivedAt?: Date;
  returnReceivedNote?: string;
  returnReceivedPhotoUrl?: string;
  status: 'Borrowed' | 'Returning' | 'Returned' | 'Exchanged';
}

export interface ILoan {
  borrowerId: mongoose.Types.ObjectId;
  borrowerName: string;
  createdById: mongoose.Types.ObjectId;
  createdByName: string;
  status: LoanStatus;
  items: ILoanToolItem[];
  borrowedAt: Date;
  returnedAt?: Date;
}

const LoanToolItemSchema = new Schema<ILoanToolItem>(
  {
    toolId: { type: Schema.Types.ObjectId, ref: 'Tool', required: true },
    toolCode: { type: String, required: true },
    toolName: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    borrowedAt: { type: Date, required: true },
    borrowedCondition: { type: String, enum: ['Good', 'Bad'], required: true },
    borrowedPhotoUrl: { type: String },
    shipmentNote: { type: String },
    reportedCondition: { type: String, enum: ['Good', 'Bad'] },
    reportedAt: { type: Date },
    returnedAt: { type: Date },
    returnCondition: { type: String, enum: ['Good', 'Bad'] },
    returnDescription: { type: String },
    returnPhotoUrl: { type: String },
    returnShipmentRequestedAt: { type: Date },
    returnShipmentNote: { type: String },
    returnShipmentPhotoUrl: { type: String },
    returnReceivedAt: { type: Date },
    returnReceivedNote: { type: String },
    returnReceivedPhotoUrl: { type: String },
    status: { type: String, enum: ['Borrowed', 'Returning', 'Returned', 'Exchanged'], default: 'Borrowed' },
  },
  { _id: false }
); 

const LoanSchema = new Schema<ILoan>({
  borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  borrowerName: { type: String, required: true },
  createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  status: { type: String, enum: ['Borrowed', 'Returned', 'PartiallyReturned', 'Exchanged'], default: 'Borrowed' },
  items: { type: [LoanToolItemSchema], required: true },
  borrowedAt: { type: Date, default: Date.now },
  returnedAt: { type: Date },
});

LoanSchema.index({ borrowerId: 1, status: 1, borrowedAt: -1 });

const Loan: Model<ILoan> = mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);

export default Loan;
