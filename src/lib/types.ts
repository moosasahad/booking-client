export enum OrderStatus {
  PENDING = "Pending",
  COOKING = "Cooking",
  PLATING = "Plating",
  SERVING = "Serving",
  COMPLETED = "Completed",
}

export interface IMenuItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
