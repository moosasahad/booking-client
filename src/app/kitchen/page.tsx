"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  HandMetal,
  Table2,
  Phone,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket-client";
import { OrderStatus } from "@/lib/types";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [waiterCalls, setWaiterCalls] = useState<
    { tableNumber: string; timestamp: string }[]
  >([]);
  const [tables, setTables] = useState<any[]>([]);

  // Reservation Modal State
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resTableNumber, setResTableNumber] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load the notification audio
  useEffect(() => {
    const audio = new Audio("/notification.wav");
    audio.preload = "auto";
    audioRef.current = audio;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [soundEnabled]);

  // Enable sound (must be triggered by user interaction to satisfy browser autoplay policy)
  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    if (audioRef.current) {
      // Play a silent/quick version to unlock audio context
      audioRef.current.volume = 0.01;
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          audioRef.current!.volume = 1;
          toast.success("Notification sound enabled!", {
            icon: "🔔",
            duration: 2000,
          });
        })
        .catch(() => {
          toast.error("Could not enable sound. Try clicking again.");
        });
    }
  }, []);

  // Dismiss a new order notification
  const dismissNewOrder = useCallback((orderId: string) => {
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchTables();
    const socket = getSocket();
    socket.emit("join-room", "kitchen");

    socket.on("order-update", (updatedOrder) => {
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === updatedOrder._id);
        if (exists) {
          // Order modification — play sound and show info toast
          playNotificationSound();
          toast(`Order #${updatedOrder.tableNumber} was modified`, {
            icon: "📝",
            duration: 4000,
          });
          return prev.map((o) =>
            o._id === updatedOrder._id ? updatedOrder : o,
          );
        }
        // Truly new order
        playNotificationSound();
        toast.success(`New Order from Table ${updatedOrder.tableNumber}`, {
          icon: "🔔",
          duration: 5000,
        });
        // Mark as new (unacknowledged)
        setNewOrderIds((prev) => new Set(prev).add(updatedOrder._id));
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
      // Auto-dismiss from new orders when status changes from Pending
      if (data.status !== "Pending") {
        dismissNewOrder(data.orderId);
      }
    });

    socket.on(
      "waiter-call",
      (data: { tableNumber: string; timestamp: string }) => {
        playNotificationSound();
        setWaiterCalls((prev) => [data, ...prev]);
        toast(`Table ${data.tableNumber} is calling the waiter!`, {
          icon: "🖐️",
          duration: 8000,
          style: {
            background: "#dc2626",
            color: "#fff",
            border: "1px solid #ef4444",
            fontWeight: "bold",
          },
        });
      },
    );

    socket.on(
      "table-status-changed",
      (data: {
        tableNumber: string;
        status: string;
        reservedByName?: string;
        reservedByPhone?: string;
      }) => {
        setTables((prev) =>
          prev.map((t) =>
            t.tableNumber === data.tableNumber
              ? {
                  ...t,
                  status: data.status,
                  reservedByName: data.reservedByName,
                  reservedByPhone: data.reservedByPhone,
                }
              : t,
          ),
        );
      },
    );

    return () => {
      socket.off("order-update");
      socket.off("status-changed");
      socket.off("waiter-call");
      socket.off("table-status-changed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`);
      const data = await res.json();
      setOrders(data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load orders");
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tables`);
      const data = await res.json();
      setTables(data);
    } catch (error) {
      console.error("Failed to fetch tables");
    }
  };

  // Fetch tables on mount
  useEffect(() => {
    fetchTables();
  }, []);

  const updateTableStatus = async (
    tableNumber: string,
    newStatus: string,
    name?: string,
    phone?: string,
  ) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tables/${tableNumber}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            reservedByName: name || null,
            reservedByPhone: phone || null,
          }),
        },
      );
      if (res.ok) {
        toast.success(`Table ${tableNumber} → ${newStatus}`);
        // Dismiss waiter call for this table
        setWaiterCalls((prev) =>
          prev.filter((c) => c.tableNumber !== tableNumber),
        );
        return true;
      }
      return false;
    } catch (error) {
      toast.error("Failed to update table status");
      return false;
    }
  };

  const handleReserveClick = (tableNumber: string) => {
    setResTableNumber(tableNumber);
    setGuestName("");
    setGuestPhone("");
    setIsResModalOpen(true);
  };

  const submitReservation = async () => {
    if (!resTableNumber) return;
    const success = await updateTableStatus(
      resTableNumber,
      "Reserved",
      guestName,
      guestPhone,
    );
    if (success) {
      setIsResModalOpen(false);
    }
  };

  const dismissWaiterCall = (tableNumber: string) => {
    setWaiterCalls((prev) => prev.filter((c) => c.tableNumber !== tableNumber));
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
        // Dismiss from new order notifications
        dismissNewOrder(orderId);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const pendingCount = orders.filter(
    (o) =>
      o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED,
  ).length;

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
      {/* Sound Enable Banner */}
      {!soundEnabled && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 via-red-500 to-amber-500 px-6 py-3 flex items-center justify-center gap-4 shadow-2xl shadow-orange-500/20"
        >
          <BellRing className="text-white animate-bounce" size={22} />
          <span className="text-white font-bold text-sm">
            Click to enable notification sounds for new orders
          </span>
          <button
            onClick={enableSound}
            className="bg-white text-orange-600 font-black text-sm px-5 py-1.5 rounded-full hover:bg-orange-50 transition-colors active:scale-95"
          >
            ENABLE SOUND
          </button>
        </motion.div>
      )}

      <header
        className={`flex justify-between items-center mb-10 ${!soundEnabled ? "mt-12" : ""}`}
      >
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ChefHat className="text-orange-500" size={36} />
            KITCHEN DASHBOARD
          </h1>
          <p className="text-neutral-500">Real-time Order Management Station</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              if (!soundEnabled) {
                enableSound();
              } else {
                setSoundEnabled(false);
                toast("Notification sound disabled", {
                  icon: "🔇",
                  duration: 2000,
                });
              }
            }}
            className={`p-3 rounded-2xl border transition-all ${
              soundEnabled
                ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
                : "bg-neutral-900 border-white/5 text-neutral-500 hover:text-white"
            }`}
            title={soundEnabled ? "Disable sound" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Notification Bell with Badge */}
          <div className="relative">
            <div
              className={`bg-neutral-900 p-3 rounded-2xl border border-white/5 ${
                newOrderIds.size > 0 ? "animate-pulse" : ""
              }`}
            >
              {newOrderIds.size > 0 ? (
                <BellRing className="text-orange-500" size={20} />
              ) : (
                <Bell className="text-neutral-500" size={20} />
              )}
            </div>
            {newOrderIds.size > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50"
              >
                {newOrderIds.size}
              </motion.div>
            )}
          </div>

          {/* Live Connection */}
          <div className="bg-neutral-900 px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold">LIVE</span>
          </div>

          {/* Active Orders Count */}
          <div className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-2xl font-black">
            {pendingCount} ACTIVE
          </div>
        </div>
      </header>

      {/* New Order Alert Banner */}
      <AnimatePresence>
        {newOrderIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <BellRing className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-orange-500 font-black text-sm">
                    {newOrderIds.size} NEW ORDER
                    {newOrderIds.size > 1 ? "S" : ""} WAITING
                  </p>
                  <p className="text-neutral-500 text-xs">
                    Click &quot;Start Cooking&quot; to acknowledge
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderIds(new Set())}
                className="text-neutral-500 hover:text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                DISMISS ALL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiter Call Alerts */}
      <AnimatePresence>
        {waiterCalls.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="space-y-3">
              {waiterCalls.map((call, idx) => (
                <div
                  key={`${call.tableNumber}-${call.timestamp}-${idx}`}
                  className="bg-red-500/10 border border-red-500/30 rounded-3xl p-4 flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                      <HandMetal className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-red-400 font-black text-sm">
                        TABLE {call.tableNumber} — CALLING WAITER
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {new Date(call.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateTableStatus(call.tableNumber, "Occupied")
                      }
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
                    >
                      MARK OCCUPIED
                    </button>
                    <button
                      onClick={() => dismissWaiterCall(call.tableNumber)}
                      className="text-neutral-500 hover:text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Status Management */}
      {tables.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Table2 className="text-orange-500" size={20} />
            TABLE STATUS
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {tables.map((table) => (
              <div
                key={table._id}
                className={`flex-shrink-0 bg-neutral-900 border rounded-2xl p-4 min-w-[160px] ${
                  table.status === "Available"
                    ? "border-green-500/30"
                    : table.status === "Reserved"
                      ? "border-red-500/30"
                      : "border-yellow-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-black text-lg">
                    #{table.tableNumber}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      table.status === "Available"
                        ? "bg-green-500/20 text-green-500"
                        : table.status === "Reserved"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-yellow-500/20 text-yellow-500"
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                {table.status === "Reserved" &&
                  (table.reservedByName || table.reservedByPhone) && (
                    <div className="mb-3 space-y-1 bg-white/5 p-2 rounded-lg">
                      {table.reservedByName && (
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <User size={10} className="text-orange-500" />
                          <span className="font-bold truncate">
                            {table.reservedByName}
                          </span>
                        </div>
                      )}
                      {table.reservedByPhone && (
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <Phone size={10} className="text-neutral-500" />
                          <span className="truncate">
                            {table.reservedByPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                <div className="flex gap-1">
                  {table.status !== "Available" && (
                    <button
                      onClick={() =>
                        updateTableStatus(table.tableNumber, "Available")
                      }
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      FREE
                    </button>
                  )}
                  {table.status !== "Reserved" && (
                    <button
                      onClick={() => handleReserveClick(table.tableNumber)}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      RESERVE
                    </button>
                  )}
                  {table.status !== "Occupied" && (
                    <button
                      onClick={() =>
                        updateTableStatus(table.tableNumber, "Occupied")
                      }
                      className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      OCCUPIED
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div
              layout
              key={order._id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`bg-neutral-900 border ${
                newOrderIds.has(order._id)
                  ? "border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/30"
                  : order.status === OrderStatus.PENDING
                    ? "border-orange-500/50 shadow-lg shadow-orange-500/5"
                    : "border-white/5"
              } rounded-4xl p-6 flex flex-col h-full overflow-hidden relative`}
            >
              {/* New Order Badge */}
              {newOrderIds.has(order._id) && (
                <motion.div
                  initial={{ x: 100 }}
                  animate={{ x: 0 }}
                  className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-red-500 text-white px-5 py-1.5 rounded-bl-2xl text-xs font-black uppercase tracking-tighter flex items-center gap-1.5"
                >
                  <BellRing size={12} className="animate-bounce" />
                  NEW ORDER
                </motion.div>
              )}
              {!newOrderIds.has(order._id) &&
                order.status === OrderStatus.PENDING && (
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

      {/* Reservation Modal */}
      <AnimatePresence>
        {isResModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-neutral-900 border border-white/10 w-full max-w-md rounded-4xl p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsResModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
                  <Table2 className="text-red-500" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    Reserve Table #{resTableNumber}
                  </h2>
                  <p className="text-neutral-500 text-sm font-bold">
                    Counter Booking
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest ml-1">
                    Guest Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"
                      size={18}
                    />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-neutral-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest ml-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"
                      size={18}
                    />
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-neutral-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={submitReservation}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-[0.98] mt-4"
                >
                  CONFIRM RESERVATION
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
