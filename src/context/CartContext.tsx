"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { IMenuItem } from "@/lib/types";

interface CartItem extends Partial<IMenuItem> {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  status?: string; // Add this just in case
  selectedOptions?: {
    name: string;
    choice: string;
    price: number;
  }[];
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (
    item: IMenuItem,
    quantity?: number,
    selectedOptions?: any[],
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  updateOptions: (cartItemId: string, options: any[], newPrice: number) => void;
  clearCart: () => void;
  loadCart: (items: CartItem[]) => void;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Helper to generate a unique ID for cart items based on options
  const generateCartItemId = (itemId: string, options: any[]) => {
    if (!options || options.length === 0) return itemId;
    const optionsString = JSON.stringify(
      options.sort((a, b) => a.name.localeCompare(b.name)),
    );
    return `${itemId}-${optionsString}`;
  };

  const addToCartWithId = (
    item: IMenuItem,
    quantity = 1,
    selectedOptions: any[] = [],
  ) => {
    setCart((prev) => {
      // Calculate price including options
      const optionsTotal = selectedOptions.reduce(
        (acc, opt) => acc + opt.price,
        0,
      );
      const finalPrice = item.price + optionsTotal;

      // Check if exact same item exists
      const existing = prev.find(
        (i: any) =>
          i._id === item._id &&
          JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions),
      );

      if (existing) {
        return prev.map((i: any) =>
          i._id === item._id &&
          JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions)
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }

      return [
        ...prev,
        {
          ...item,
          _id: item._id, // Keep original ID for reference
          price: finalPrice, // Store the calculated unit price
          quantity,
          selectedOptions,
          cartId: Math.random().toString(36).substr(2, 9), // Simple unique ID
        },
      ];
    });
  };

  const removeFromCartWithId = (cartId: string) => {
    setCart((prev) => prev.filter((i: any) => i.cartId !== cartId));
  };

  const updateQuantityWithId = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i: any) => {
          if (i.cartId === cartId) {
            const newQty = Math.max(0, i.quantity + delta);
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const updateOptionsWithId = (
    cartId: string,
    selectedOptions: any[],
    newPrice: number,
  ) => {
    setCart((prev) =>
      prev.map((i: any) =>
        i.cartId === cartId ? { ...i, selectedOptions, price: newPrice } : i,
      ),
    );
  };

  const loadCart = (items: CartItem[]) => {
    setCart(items);
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart: addToCartWithId,
        removeFromCart: removeFromCartWithId,
        updateQuantity: updateQuantityWithId,
        updateOptions: updateOptionsWithId,
        clearCart: () => setCart([]),
        loadCart,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
