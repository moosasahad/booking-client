export enum OrderStatus {
  PENDING = "Pending",
  COOKING = "Cooking",
  PLATING = "Plating",
  SERVING = "Serving",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export interface IMenuItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  description?: string;
  options?: {
    name: string;
    type: "single" | "multiple";
    choices: {
      name: string;
      price: number;
      available: boolean;
    }[];
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IOrder {
  _id: string;
  tableNumber: string;
  items: {
    menuId: string;
    name: string;
    price: number;
    quantity: number;
    selectedOptions?: {
      name: string;
      choice: string;
      price: number;
    }[];
  }[];
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: "Cash" | "Online";
  note?: string;
  createdAt: string;
}
