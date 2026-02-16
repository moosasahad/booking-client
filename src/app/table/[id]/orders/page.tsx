"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Utensils,
  ChevronRight,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { OrderStatus } from "@/lib/types";
import { getSocket } from "@/lib/socket-client";

const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
  [OrderStatus.PENDING]: {
    color: "text-orange-500",
    icon: Clock,
    bg: "bg-orange-500/10",
  },
  [OrderStatus.COOKING]: {
    color: "text-yellow-500",
    icon: ChefHat,
    bg: "bg-yellow-500/10",
  },
  [OrderStatus.PLATING]: {
    color: "text-blue-500",
    icon: Utensils,
    bg: "bg-blue-500/10",
  },
  [OrderStatus.SERVING]: {
    color: "text-purple-500",
    icon: Package,
    bg: "bg-purple-500/10",
  },
  [OrderStatus.COMPLETED]: {
    color: "text-green-500",
    icon: CheckCircle2,
    bg: "bg-green-500/10",
  },
  [OrderStatus.CANCELLED]: {
    color: "text-red-500",
    icon: XCircle,
    bg: "bg-red-500/10",
  },
};

export default function OrderHistoryPage() {
  const { id: tableId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();

    const socket = getSocket();
    socket.emit("join-room", `table-${tableId}`);

    socket.on("status-changed", (data) => {
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId
            ? { ...order, status: data.status }
            : order,
        ),
      );
    });

    return () => {
      socket.off("status-changed");
    };
  }, [tableId]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/table/${tableId}`,
      );
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this order?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Cancelled" }),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o._id === updated._id ? updated : o)),
        );
        toast.success("Order cancelled");
        const socket = getSocket();
        socket.emit("update-status", {
          orderId: updated._id,
          tableNumber: tableId,
          status: "Cancelled",
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Cannot cancel");
      }
    } catch {
      toast.error("Error cancelling order");
    }
  };

  const filteredOrders =
    filter === "all"
      ? orders
      : filter === "active"
        ? orders.filter(
            (o) =>
              o.status !== OrderStatus.COMPLETED &&
              o.status !== OrderStatus.CANCELLED,
          )
        : orders.filter(
            (o) =>
              o.status === OrderStatus.COMPLETED ||
              o.status === OrderStatus.CANCELLED,
          );

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/table/${tableId}`}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Order History</h1>
              <p className="text-xs text-neutral-500">
                Table {tableId} · {orders.length} orders
              </p>
            </div>
          </div>
          <Link
            href={`/table/${tableId}/profile`}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-sm font-medium hover:bg-neutral-800 transition-colors border border-white/5"
          >
            Profile
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {["all", "active", "past"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Orders */}
      <div className="px-6 mt-6 space-y-4">
        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-neutral-700 mb-4" />
            <p className="text-neutral-500 font-medium">No orders found</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => {
            const config =
              statusConfig[order.status] || statusConfig[OrderStatus.PENDING];
            const StatusIcon = config.icon;

            return (
              <motion.div
                layout
                key={order._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-neutral-900/60 border border-white/5 rounded-2xl overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}
                    >
                      <StatusIcon size={20} className={config.color} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        Order #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(order.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.bg} ${config.color}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 pb-4 space-y-2">
                  {order.items.map((item: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-300">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-neutral-400 font-mono">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      {item.selectedOptions &&
                        item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-5">
                            {item.selectedOptions.map(
                              (opt: any, oi: number) => (
                                <span
                                  key={oi}
                                  className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md"
                                >
                                  {opt.choice}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-neutral-800/30 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-orange-500">
                      ₹{order.totalPrice.toFixed(2)}
                    </span>
                    {order.paymentMethod && (
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          order.paymentMethod === "Cash"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {order.paymentMethod}
                      </span>
                    )}
                    {order.note && (
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded">
                        📝 Note
                      </span>
                    )}
                  </div>
                  {order.status === OrderStatus.PENDING && (
                    <button
                      onClick={() => cancelOrder(order._id)}
                      className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
