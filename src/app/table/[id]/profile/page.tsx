"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  ShoppingCart,
  DollarSign,
  Hash,
  User,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { OrderStatus } from "@/lib/types";

export default function ProfilePage() {
  const { id: tableId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [tableId]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/table/${tableId}`,
      );
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const totalItems = orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .reduce(
      (sum, o) =>
        sum + o.items.reduce((s: number, i: any) => s + i.quantity, 0),
      0,
    );

  const completedOrders = orders.filter(
    (o) => o.status === OrderStatus.COMPLETED,
  ).length;

  const activeOrders = orders.filter(
    (o) =>
      o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED,
  ).length;

  // Find most ordered item
  const itemCounts: Record<string, number> = {};
  orders
    .filter((o) => o.status !== OrderStatus.CANCELLED)
    .forEach((o) => {
      o.items.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
  const favoriteItem =
    Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/table/${tableId}`}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </header>

      <div className="px-6 mt-8">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="w-24 h-24 rounded-full bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-2xl shadow-orange-500/20">
            <User size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black">Table {tableId}</h2>
          <p className="text-neutral-500 text-sm mt-1">Guest Customer</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ShoppingCart size={16} className="text-orange-500" />
              </div>
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                Orders
              </span>
            </div>
            <p className="text-3xl font-black">{orders.length}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {activeOrders} active
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign size={16} className="text-green-500" />
              </div>
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                Spent
              </span>
            </div>
            <p className="text-3xl font-black">₹{totalSpent.toFixed(2)}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {completedOrders} completed
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Hash size={16} className="text-blue-500" />
              </div>
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                Items
              </span>
            </div>
            <p className="text-3xl font-black">{totalItems}</p>
            <p className="text-xs text-neutral-500 mt-1">items ordered</p>
          </div>

          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package size={16} className="text-purple-500" />
              </div>
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
                Favorite
              </span>
            </div>
            <p className="text-lg font-black truncate">
              {favoriteItem ? favoriteItem[0] : "—"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {favoriteItem ? `ordered ${favoriteItem[1]}×` : "no orders yet"}
            </p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <Link
            href={`/table/${tableId}/orders`}
            className="flex items-center justify-between bg-neutral-900/60 border border-white/5 rounded-2xl p-5 hover:bg-neutral-800/60 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Clock size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="font-bold">Order History</p>
                <p className="text-xs text-neutral-500">
                  View all your past orders
                </p>
              </div>
            </div>
            <ArrowLeft
              size={16}
              className="rotate-180 text-neutral-600 group-hover:text-orange-500 transition-colors"
            />
          </Link>

          <Link
            href={`/table/${tableId}`}
            className="flex items-center justify-between bg-neutral-900/60 border border-white/5 rounded-2xl p-5 hover:bg-neutral-800/60 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <ShoppingCart size={20} className="text-green-500" />
              </div>
              <div>
                <p className="font-bold">Browse Menu</p>
                <p className="text-xs text-neutral-500">Start a new order</p>
              </div>
            </div>
            <ArrowLeft
              size={16}
              className="rotate-180 text-neutral-600 group-hover:text-green-500 transition-colors"
            />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
