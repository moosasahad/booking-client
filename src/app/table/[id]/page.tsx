"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, Search, Clock } from "lucide-react";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket-client";

export default function TablePage() {
  const { id: tableId } = useParams();
  const { cart, addToCart, updateQuantity, totalPrice, clearCart } = useCart();
  const [menu, setMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [recentOrder, setRecentOrder] = useState<any>(null);

  useEffect(() => {
    fetchMenu();

    const socket = getSocket();
    socket.emit("join-room", `table-${tableId}`);

    socket.on("status-changed", (data) => {
      setRecentOrder((prev: any) => {
        if (prev && prev._id === data.orderId) {
          return { ...prev, status: data.status };
        }
        return prev;
      });
      toast.success(`Order status updated to: ${data.status}`);
    });

    return () => {
      socket.off("status-changed");
    };
  }, [tableId]);

  const fetchMenu = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/menu");
      const data = await res.json();
      setMenu(data);
      const cats = ["All", ...new Set(data.map((item: any) => item.category))];
      setCategories(cats as string[]);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load menu");
      setLoading(false);
    }
  };

  const filteredMenu =
    activeCategory === "All"
      ? menu
      : menu.filter((item) => item.category === activeCategory);

  const placeOrder = async () => {
    if (cart.length === 0) return;

    const loadingToast = toast.loading("Placing your order...");

    try {
      const orderData = {
        tableNumber: tableId,
        items: cart.map((item) => ({
          menuId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalPrice,
      };

      const res = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        const order = await res.json();
        setRecentOrder(order);
        clearCart();
        setIsCartOpen(false);
        toast.dismiss(loadingToast);
        toast.success("Order placed successfully!");

        // Notify kitchen via socket
        const socket = getSocket();
        socket.emit("new-order", order);
      } else {
        throw new Error("Failed to place order");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to place order. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 glass px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold bg-linear-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            NEX-CREW
          </h1>
          <p className="text-xs text-neutral-400">Table No. {tableId}</p>
        </div>
        {recentOrder && (
          <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1 rounded-full text-xs animate-pulse">
            <Clock size={14} className="text-orange-500" />
            <span>{recentOrder.status}</span>
          </div>
        )}
      </header>

      {/* Categories */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
        {filteredMenu.map((item) => (
          <motion.div
            layout
            key={item._id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900/50 rounded-3xl overflow-hidden border border-neutral-800 food-card-hover group"
          >
            <div className="relative h-48 w-full overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold border border-white/10">
                ${item.price}
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold mb-1">{item.name}</h3>
              <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
                {item.description ||
                  "Freshly prepared with premium ingredients."}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500 uppercase tracking-widest">
                  {item.category}
                </span>
                <button
                  onClick={() => {
                    addToCart(item);
                    toast.success(`Added ${item.name} to cart`);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 p-2 rounded-xl transition-colors shadow-lg shadow-orange-500/10"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-8 py-4 rounded-full shadow-2xl shadow-orange-500/40 flex items-center gap-4 z-50 hover:scale-105 transition-transform"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-neutral-900 rounded-t-[3rem] p-8 z-50 border-t border-white/5"
            >
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto mb-8" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Your Order</h2>
                <button
                  onClick={() => clearCart()}
                  className="text-red-500 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto mb-8 space-y-4 no-scrollbar">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 bg-neutral-800/50 p-4 rounded-2xl"
                  >
                    <img
                      src={item.image}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-orange-500 font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl">
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="w-6 text-center font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-neutral-400 font-medium">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-extrabold">
                  <span>Total</span>
                  <span className="text-orange-500">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={placeOrder}
                  className="w-full bg-linear-to-r from-orange-500 to-red-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-transform"
                >
                  Place Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
