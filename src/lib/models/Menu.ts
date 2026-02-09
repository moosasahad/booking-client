import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  description?: string;
}

const MenuSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.Menu ||
  mongoose.model<IMenuItem>("Menu", MenuSchema);
