"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  QrCode,
  Settings,
  LogOut,
  LayoutGrid,
  ListOrdered,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "qrcode";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("menu"); // menu, orders, tables
  const [menu, setMenu] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    tableId: string;
    qrData: string;
  }>({
    isOpen: false,
    tableId: "",
    qrData: "",
  });

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    description: "",
    available: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, orderRes] = await Promise.all([
        fetch("http://localhost:5000/api/menu"),
        fetch("http://localhost:5000/api/orders"),
      ]);
      setMenu(await menuRes.json());
      setOrders(await orderRes.json());
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem ? "PUT" : "POST";
    const url = editingItem
      ? `http://localhost:5000/api/menu/${editingItem._id}`
      : "http://localhost:5000/api/menu";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(`Item ${editingItem ? "updated" : "added"}`);
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({
          name: "",
          price: "",
          category: "",
          image: "",
          description: "",
          available: true,
        });
        fetchData();
      }
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/menu/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Item deleted");
        fetchData();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const generateQR = async (tableId: string) => {
    try {
      // Create an absolute URL based on current origin
      const url = `${window.location.origin}/table/${tableId}`;
      const qrData = await QRCode.toDataURL(url);
      setQrModal({ isOpen: true, tableId, qrData });
    } catch (err) {
      toast.error("Could not generate QR code");
    }
  };

  const Statistics = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
      {[
        {
          label: "Total Revenue",
          value: `$${orders.reduce((s, o) => s + o.totalPrice, 0).toFixed(2)}`,
          icon: BarChart3,
          color: "text-green-500",
        },
        {
          label: "Active Orders",
          value: orders.filter((o) => o.status !== "Completed").length,
          icon: ListOrdered,
          color: "text-orange-500",
        },
        {
          label: "Menu Items",
          value: menu.length,
          icon: UtensilsCrossed,
          color: "text-blue-500",
        },
        {
          label: "Completed Orders",
          value: orders.filter((o) => o.status === "Completed").length,
          icon: CheckCircle,
          color: "text-purple-500",
        },
      ].map((stat, i) => (
        <div
          key={i}
          className="bg-neutral-900 border border-white/5 p-6 rounded-4xl"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl bg-neutral-800 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
          <h3 className="text-neutral-400 text-sm font-medium">{stat.label}</h3>
          <p className="text-3xl font-black mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-neutral-950 p-6 flex-col hidden lg:flex">
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-black text-white">NEX-ADMIN</h1>
          <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">
            Control Center
          </p>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "menu", label: "Menu Management", icon: LayoutGrid },
            { id: "orders", label: "Order History", icon: ListOrdered },
            { id: "tables", label: "Tables & QR", icon: QrCode },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                activeTab === item.id
                  ? "bg-orange-500 text-white shadow-xl shadow-orange-500/10"
                  : "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5">
          <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-500/10 transition-all">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 h-screen overflow-y-auto no-scrollbar">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            {activeTab === "menu"
              ? "Menu Items"
              : activeTab === "orders"
                ? "Order Logs"
                : "Table Station"}
          </h2>
          <div className="flex gap-4">
            {activeTab === "menu" && (
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setEditingItem(null);
                  setFormData({
                    name: "",
                    price: "",
                    category: "",
                    image: "",
                    description: "",
                    available: true,
                  });
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-orange-500/10"
              >
                <Plus size={20} /> ADD ITEM
              </button>
            )}
          </div>
        </header>

        <Statistics />

        {/* Tab Content */}
        <div className="bg-neutral-900 border border-white/5 rounded-[2.5rem] overflow-hidden">
          {activeTab === "menu" ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-neutral-950/50">
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Item
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Category
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Price
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {menu.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-black text-white">{item.name}</p>
                          <p className="text-neutral-500 text-xs">
                            {item.description?.substring(0, 30)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-black text-white">
                      ${item.price}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${item.available ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span className="text-sm font-medium">
                          {item.available ? "In Stock" : "Sold Out"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setFormData(item);
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-orange-500/10 text-neutral-500 hover:text-orange-500 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteItem(item._id)}
                          className="p-2 hover:bg-red-500/10 text-neutral-500 hover:text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "orders" ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-neutral-950/50">
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Order ID
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Table
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Total
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-8 py-6 text-neutral-500 text-xs font-black uppercase tracking-widest">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-8 py-6 font-mono text-neutral-500 text-xs">
                      #{order._id.substring(order._id.length - 8)}
                    </td>
                    <td className="px-8 py-6 font-black text-white">
                      Table {order.tableNumber}
                    </td>
                    <td className="px-8 py-6 font-black text-orange-500">
                      ${order.totalPrice.toFixed(2)}
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === "Completed"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-orange-500/10 text-orange-500"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-neutral-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 p-8 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tabId) => (
                <div
                  key={tabId}
                  className="bg-neutral-950 border border-white/5 p-8 rounded-4xl flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-neutral-900 rounded-3xl flex items-center justify-center text-2xl font-black text-orange-500 mb-4">
                    {tabId}
                  </div>
                  <h3 className="font-black text-xl mb-1 text-white">
                    Table {tabId}
                  </h3>
                  <p className="text-neutral-500 text-sm mb-6">
                    Active Ordering Station
                  </p>
                  <button
                    onClick={() => generateQR(tabId.toString())}
                    className="w-full bg-neutral-900 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
                  >
                    <QrCode
                      size={18}
                      className="group-hover:rotate-12 transition-transform"
                    />{" "}
                    VIEW QR CODE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-neutral-950 border border-white/10 w-full max-w-xl rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-10">
                <h3 className="text-3xl font-black mb-8 uppercase tracking-tighter">
                  {editingItem ? "Edit" : "Add New"} Menu Item
                </h3>
                <form onSubmit={handleSaveItem} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      Item Name
                    </label>
                    <input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-colors"
                      placeholder="e.g. Wagyu Truffle Burger"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-colors"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-colors appearance-none"
                        required
                      >
                        <option value="">Select...</option>
                        <option value="Starters">Starters</option>
                        <option value="Main Course">Main Course</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Drinks">Drinks</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      Image URL
                    </label>
                    <input
                      value={formData.image}
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.value })
                      }
                      className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-colors"
                      placeholder="https://unsplash.com/..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 transition-colors h-24 resize-none"
                      placeholder="Describe the flavors..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="available"
                      checked={formData.available}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          available: e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-orange-500"
                    />
                    <label htmlFor="available" className="font-bold">
                      Item Available
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-orange-500/20 transition-all active:scale-95"
                  >
                    SAVE MENU ITEM
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {qrModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrModal({ ...qrModal, isOpen: false })}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-10 rounded-[3rem] flex flex-col items-center max-w-sm w-full"
            >
              <div className="mb-6 flex flex-col items-center">
                <div className="bg-orange-500 text-white px-6 py-2 rounded-full font-black text-sm mb-4">
                  TABLE {qrModal.tableId}
                </div>
                <h3 className="text-black text-2xl font-black tracking-tighter">
                  SCAN TO ORDER
                </h3>
              </div>
              <img src={qrModal.qrData} className="w-64 h-64 mb-8" />
              <button
                onClick={() => window.print()}
                className="w-full bg-black text-white font-black py-4 rounded-2xl mb-4"
              >
                PRINT QR CODE
              </button>
              <button
                onClick={() => setQrModal({ ...qrModal, isOpen: false })}
                className="text-neutral-400 font-bold"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
