"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ChefHat, Utensils, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket-client";
import { OrderStatus } from "@/lib/types";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const socket = getSocket();
    socket.emit("join-room", "kitchen");

    socket.on("order-update", (updatedOrder) => {
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === updatedOrder._id);
        if (exists) {
          return prev.map((o) =>
            o._id === updatedOrder._id ? updatedOrder : o,
          );
        }
        // Only play sound/toast for truly new orders to avoid spam
        new Audio("/notification.mp3").play().catch(() => {});
        toast.success(`New Order from Table ${updatedOrder.tableNumber}`, {
          icon: "🔔",
          duration: 5000,
        });
        return [updatedOrder, ...prev];
      });
    });

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
      socket.off("order-update");
      socket.off("status-changed");
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`);
      const data = await res.json();
      // Filter out completed orders or show them at the bottom
      setOrders(data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load orders");
      setLoading(false);
    }
  };

  const updateStatus = async (
    orderId: string,
    tableNumber: string,
    status: OrderStatus,
  ) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      if (res.ok) {
        const socket = getSocket();
        socket.emit("update-status", { orderId, tableNumber, status });
        toast.success(`Order ${status}`);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
          <p className="text-neutral-400 animate-pulse">
            Initializing Kitchen Station...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 lg:p-10 font-outfit">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ChefHat className="text-orange-500" size={36} />
            KITCHEN DASHBOARD
          </h1>
          <p className="text-neutral-500">Real-time Order Management Station</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-neutral-900 px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold">LIVE CONNECTION</span>
          </div>
          <div className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-2xl font-black">
            {orders.filter((o) => o.status !== OrderStatus.COMPLETED).length}{" "}
            ACTIVE ORDERS
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div
              layout
              key={order._id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`bg-neutral-900 border ${order.status === OrderStatus.PENDING ? "border-orange-500/50 shadow-lg shadow-orange-500/5" : "border-white/5"} rounded-4xl p-6 flex flex-col h-full overflow-hidden relative`}
            >
              {order.status === OrderStatus.PENDING && (
                <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-2xl text-xs font-black uppercase tracking-tighter">
                  NEW ORDER
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black text-white">
                    #{order.tableNumber}
                  </h2>
                  <div className="flex items-center gap-2 text-neutral-500 text-sm mt-1">
                    <Clock size={14} />
                    <span>
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {order.paymentMethod && (
                    <div
                      className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${order.paymentMethod === "Cash" ? "bg-green-500/20 text-green-500" : "bg-blue-500/20 text-blue-500"}`}
                    >
                      {order.paymentMethod}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                      order.status === OrderStatus.PENDING
                        ? "bg-orange-500/20 text-orange-500"
                        : order.status === OrderStatus.COOKING
                          ? "bg-yellow-500/20 text-yellow-500"
                          : order.status === OrderStatus.PLATING
                            ? "bg-blue-500/20 text-blue-500"
                            : order.status === OrderStatus.SERVING
                              ? "bg-purple-500/20 text-purple-500"
                              : order.status === OrderStatus.CANCELLED
                                ? "bg-red-500/20 text-red-500"
                                : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {order.status}
                  </div>
                </div>
              </div>

              {order.note && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                  <h4 className="text-yellow-500 text-xs font-bold uppercase mb-1">
                    Note
                  </h4>
                  <p className="text-sm text-yellow-200">{order.note}</p>
                </div>
              )}

              <div className="flex-1 space-y-4 mb-8">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center font-black text-white group-hover:bg-orange-500 transition-colors">
                        {item.quantity}
                      </div>
                      <span className="font-bold text-neutral-300 group-hover:text-white transition-colors">
                        {item.name}
                      </span>
                    </div>
                    {item.selectedOptions &&
                      item.selectedOptions.length > 0 && (
                        <div className="pl-14">
                          {item.selectedOptions.map(
                            (opt: any, oIdx: number) => (
                              <div
                                key={oIdx}
                                className="text-xs text-neutral-500 flex items-center gap-1"
                              >
                                <span className="w-1 h-1 bg-neutral-600 rounded-full" />
                                <span>{opt.choice}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {order.status === OrderStatus.PENDING && (
                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        order.tableNumber,
                        OrderStatus.COOKING,
                      )
                    }
                    className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <ChefHat size={20} /> START COOKING
                  </button>
                )}
                {order.status === OrderStatus.COOKING && (
                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        order.tableNumber,
                        OrderStatus.PLATING,
                      )
                    }
                    className="col-span-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Utensils size={20} /> READY FOR PLATING
                  </button>
                )}
                {order.status === OrderStatus.PLATING && (
                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        order.tableNumber,
                        OrderStatus.SERVING,
                      )
                    }
                    className="col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Bell size={20} /> READY TO SERVE
                  </button>
                )}
                {order.status === OrderStatus.SERVING && (
                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        order.tableNumber,
                        OrderStatus.COMPLETED,
                      )
                    }
                    className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={20} /> MARK COMPLETED
                  </button>
                )}
                {order.status === OrderStatus.COMPLETED && (
                  <div className="col-span-2 text-center text-neutral-600 font-bold py-4">
                    ORDER DELIVERED
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
