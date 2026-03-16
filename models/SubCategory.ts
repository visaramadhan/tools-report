import mongoose, { Schema, Model } from 'mongoose';

export interface ISubCategory {
  name: string;
  prefix: string;
  categoryId: mongoose.Types.ObjectId;
  categoryName: string; // Denormalized for easier display
  description?: string;
  createdAt: Date;
}

const SubCategorySchema = new Schema<ISubCategory>({
  name: { type: String, required: true },
  prefix: { type: String, required: true, uppercase: true, trim: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  categoryName: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index to ensure unique subcategory name per category (optional but good)
// But user wants global unique prefix or per subcategory? 
// "prefix APD di atur di sub kategori" -> Implies Prefix is property of SubCategory.
// Usually prefixes should be unique globally to avoid collision in Tool Code.
SubCategorySchema.index({ prefix: 1 }, { unique: true });

const SubCategory: Model<ISubCategory> = mongoose.models.SubCategory || mongoose.model<ISubCategory>('SubCategory', SubCategorySchema);

export default SubCategory;
