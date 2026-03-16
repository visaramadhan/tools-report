import mongoose, { Schema, Model } from 'mongoose';

export interface ICategory {
  name: string;
  description?: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
