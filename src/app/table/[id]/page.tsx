"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Clock,
  X,
  ChevronRight,
  Calculator,
  User,
  History,
  CreditCard,
  QrCode,
  Wallet,
  CheckCircle,
  Ban,
  Trash2,
  Edit2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket-client";
import { IMenuItem } from "@/lib/types";
import QRCode from "qrcode";

export default function TablePage() {
  const { id: tableId } = useParams();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    loadCart,
    updateOptions,
  } = useCart();
  const [menu, setMenu] = useState<IMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [recentOrder, setRecentOrder] = useState<any>(null);

  // New State for Customizations & Checkout
  const [selectedItem, setSelectedItem] = useState<IMenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Online">("Cash");
  const [modifyingOrderId, setModifyingOrderId] = useState<string | null>(null);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  // Order Detail Modal
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"qr" | "card">("qr");
  const [paymentQr, setPaymentQr] = useState("");
  const [cardForm, setCardForm] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchMenu();
    fetchActiveOrder();

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu`);
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

  const fetchActiveOrder = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/table/${tableId}`,
      );
      if (res.ok) {
        const orders = await res.json();
        const active = orders[0]; // Get latest order
        if (
          active &&
          active.status !== "Completed" &&
          active.status !== "Cancelled"
        ) {
          setRecentOrder(active);
        } else if (active) {
          // Keep it visible even if completed/cancelled so they can see history?
          // Actually, for "Edit" flow we only care if Pending.
          // But we want to show status badge regardless.
          setRecentOrder(active);
        }
      }
    } catch (error) {
      console.error("Failed to fetch active order");
    }
  };

  const filteredMenu =
    activeCategory === "All"
      ? menu
      : menu.filter((item) => item.category === activeCategory);

  const handleAddToCart = (item: IMenuItem) => {
    if (item.options && item.options.length > 0) {
      setSelectedItem(item);
      setSelectedOptions([]);
      setIsOptionsOpen(true);
    } else {
      addToCart(item);
      toast.success(`Added ${item.name} to cart`);
    }
  };

  const confirmAddToCart = () => {
    if (selectedItem) {
      if (editingCartId && updateOptions) {
        const optionsTotal = selectedOptions.reduce(
          (acc, opt) => acc + opt.price,
          0,
        );
        const finalPrice = selectedItem.price + optionsTotal;
        updateOptions(editingCartId, selectedOptions, finalPrice);
        toast.success("Options updated");
        setEditingCartId(null);
      } else {
        addToCart(selectedItem, 1, selectedOptions);
        toast.success(`Added ${selectedItem.name} to cart`);
      }
      setIsOptionsOpen(false);
      setSelectedItem(null);
      setSelectedOptions([]);
    }
  };

  const handleOptionSelect = (optionName: string, choice: any) => {
    setSelectedOptions((prev) => {
      const optionGroup = selectedItem?.options?.find(
        (o) => o.name === optionName,
      );
      const isMultiple = optionGroup?.type === "multiple";

      if (isMultiple) {
        const isSelected = prev.some(
          (o) => o.name === optionName && o.choice === choice.name,
        );
        if (isSelected) {
          return prev.filter(
            (o) => !(o.name === optionName && o.choice === choice.name),
          );
        } else {
          return [
            ...prev,
            { name: optionName, choice: choice.name, price: choice.price },
          ];
        }
      } else {
        const existing = prev.filter((o) => o.name !== optionName);
        return [
          ...existing,
          { name: optionName, choice: choice.name, price: choice.price },
        ];
      }
    });
  };

  const handleEditCartItemOptions = (item: any) => {
    const menuItem = menu.find(
      (m) => m._id === item._id || m.name === item.name,
    );
    if (menuItem) {
      setSelectedItem(menuItem);
      setSelectedOptions(item.selectedOptions || []);
      setEditingCartId(item.cartId);
      setIsOptionsOpen(true);
    }
  };

  const handleEditOrder = (order: any) => {
    // Map order items to cart items
    const cartItems = order.items.map((item: any) => ({
      ...item,
      _id: item.menuId, // Map menuId back to _id for cart logic
      cartId: Math.random().toString(36).substr(2, 9), // Generate new cart IDs
    }));

    loadCart(cartItems);
    setModifyingOrderId(order._id);
    setOrderNote(order.note || "");
    setPaymentMethod(order.paymentMethod || "Cash");
    setIsOrderDetailOpen(false);
    setIsCartOpen(true);
    toast.success("Editing mode enabled! Add items from menu or modify cart.", {
      duration: 4000,
    });
  };

  const cancelOrder = async () => {
    if (!recentOrder) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${recentOrder._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Cancelled" }),
        },
      );

      if (res.ok) {
        const updatedOrder = await res.json();
        setRecentOrder(updatedOrder);
        toast.success("Order cancelled successfully");

        const socket = getSocket();
        socket.emit("update-status", {
          orderId: updatedOrder._id,
          tableNumber: tableId,
          status: "Cancelled",
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel order");
      }
    } catch (error) {
      toast.error("Error cancelling order");
    }
  };

  const handleRemoveSingleItem = async (orderId: string, itemIndex: number) => {
    if (!recentOrder || recentOrder.status !== "Pending") return;
    if (!confirm("Remove this item from your order?")) return;

    const updatedItems = [...recentOrder.items];
    updatedItems.splice(itemIndex, 1);

    if (updatedItems.length === 0) {
      await cancelOrder();
      return;
    }

    const newTotalPrice = updatedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: updatedItems,
            totalPrice: newTotalPrice,
          }),
        },
      );

      if (res.ok) {
        const updatedOrder = await res.json();
        setRecentOrder(updatedOrder);
        toast.success("Item removed from order");

        const socket = getSocket();
        socket.emit("update-status", {
          orderId: updatedOrder._id,
          tableNumber: tableId,
          status: updatedOrder.status,
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update order");
      }
    } catch (error) {
      toast.error("Error updating order");
    }
  };

  const submitOrder = async () => {
    const loadingToast = toast.loading("Placing your order...");

    try {
      const orderData = {
        tableNumber: tableId,
        items: cart.map((item: any) => ({
          menuId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
        })),
        totalPrice,
        paymentMethod,
        note: orderNote,
      };

      let res;
      if (modifyingOrderId) {
        // Update existing order
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${modifyingOrderId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          },
        );
      } else {
        // Create new order
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
      }

      if (res.ok) {
        const order = await res.json();
        setRecentOrder(order);
        clearCart();
        setIsCartOpen(false);
        setIsPaymentOpen(false);
        setOrderNote("");
        setPaymentMethod("Cash");
        setModifyingOrderId(null);
        // setCardForm({ number: "", expiry: "", cvv: "", name: "" }); // fixed variable name?
        // Actually cardFrom was correct in state.
        setCardForm({ number: "", expiry: "", cvv: "", name: "" });
        toast.dismiss(loadingToast);
        toast.success(
          modifyingOrderId
            ? "Order updated successfully!"
            : "Order placed successfully!",
        );

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

  const placeOrder = async () => {
    if (cart.length === 0) return;

    // If Online payment, open the payment modal first
    if (paymentMethod === "Online") {
      // Generate a demo QR code
      try {
        const qr = await QRCode.toDataURL(
          `upi://pay?pa=nexcrew@upi&pn=NexCrew&am=${totalPrice.toFixed(2)}&cu=INR&tn=Table${tableId}`,
        );
        setPaymentQr(qr);
      } catch {
        setPaymentQr("");
      }
      setIsPaymentOpen(true);
      return;
    }

    // Cash payment — place directly
    await submitOrder();
  };

  const handleDemoPayment = async () => {
    setPaymentProcessing(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setPaymentProcessing(false);
    toast.success("Payment successful! ✅");
    await submitOrder();
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
        <div className="flex items-center gap-2">
          {recentOrder && (
            <button
              onClick={() => setIsOrderDetailOpen(true)}
              className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-full text-xs hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <Clock size={14} className="text-orange-500" />
              <span className="font-bold">{recentOrder.status}</span>
              <ChevronRight size={14} className="text-neutral-500" />
            </button>
          )}
          <Link
            href={`/table/${tableId}/orders`}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-colors"
            title="Order History"
          >
            <History size={18} className="text-neutral-400" />
          </Link>
          <Link
            href={`/table/${tableId}/profile`}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-colors"
            title="Profile"
          >
            <User size={18} className="text-neutral-400" />
          </Link>
        </div>
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
                ₹{item.price}
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
                  onClick={() => handleAddToCart(item)}
                  className="bg-orange-500 hover:bg-orange-600 p-2 rounded-xl transition-colors shadow-lg shadow-orange-500/10"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Options Modal */}
      <AnimatePresence>
        {isOptionsOpen && selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setIsOptionsOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-x-4 top-[10%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:h-auto bg-neutral-900 rounded-3xl z-60 overflow-hidden border border-white/10 max-h-[85vh] flex flex-col"
            >
              <div className="relative h-48">
                <img
                  src={selectedItem.image}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-neutral-900 to-transparent" />
                <button
                  onClick={() => setIsOptionsOpen(false)}
                  className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white backdrop-blur-md"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-6">
                  <h3 className="text-2xl font-bold">{selectedItem.name}</h3>
                  <p className="text-orange-500 font-bold text-lg">
                    ₹{selectedItem.price}
                  </p>
                </div>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto no-scrollbar">
                {selectedItem.options?.map((option, idx) => (
                  <div key={idx} className="mb-6">
                    <h4 className="font-bold text-lg mb-3 flex justify-between">
                      {option.name}
                      <span className="text-xs font-normal text-neutral-400 bg-neutral-800 px-2 py-1 rounded-lg uppercase">
                        {option.type === "multiple"
                          ? "Select Multiple"
                          : "Select One"}
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {option.choices.map((choice, cIdx) => {
                        const isSelected = selectedOptions.some(
                          (o) =>
                            o.name === option.name && o.choice === choice.name,
                        );
                        return (
                          <div
                            key={cIdx}
                            onClick={() =>
                              handleOptionSelect(option.name, choice)
                            }
                            className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                              isSelected
                                ? "bg-orange-500/20 border-orange-500 text-orange-500"
                                : "bg-neutral-800 border-transparent hover:bg-neutral-800/80"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-orange-500" : "border-neutral-500"}`}
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                )}
                              </div>
                              <span>{choice.name}</span>
                            </div>
                            {choice.price > 0 && <span>+₹{choice.price}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-white/5 bg-neutral-900">
                <button
                  onClick={confirmAddToCart}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  Add to Cart - ₹
                  {(
                    selectedItem.price +
                    selectedOptions.reduce((acc, o) => acc + o.price, 0)
                  ).toFixed(2)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            <span className="font-bold text-lg">₹{totalPrice.toFixed(2)}</span>
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
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-neutral-900 rounded-t-[3rem] p-8 z-50 border-t border-white/5 max-h-[85vh] overflow-y-auto no-scrollbar"
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
                {cart.map((item: any) => (
                  <div
                    key={item.cartId} // Changed from item._id to Item.cartId
                    className="flex flex-col bg-neutral-800/50 p-4 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold">{item.name}</h4>
                          <button
                            onClick={() => handleEditCartItemOptions(item)}
                            className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1.5 rounded-lg hover:bg-orange-500/30 transition-all font-bold"
                          >
                            <Edit2 size={10} /> Edit Options
                          </button>
                        </div>
                        <p className="text-orange-500 font-bold">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl">
                        <button
                          onClick={() => updateQuantity(item.cartId, -1)}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="w-6 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartId, 1)}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                    {item.selectedOptions &&
                      item.selectedOptions.length > 0 && (
                        <div className="mt-3 pl-20 grid grid-cols-2 gap-2">
                          {item.selectedOptions.map((opt: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-xs text-neutral-400 flex items-center gap-1"
                            >
                              <ChevronRight
                                size={12}
                                className="text-orange-500"
                              />
                              <span>{opt.choice}</span>
                              {opt.price > 0 && (
                                <span className="text-white">
                                  +₹{opt.price}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("Cash")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === "Cash" ? "bg-orange-500/20 border-orange-500 text-orange-500" : "bg-neutral-800 border-white/5 opacity-50"}`}
                    >
                      <span className="font-bold">Cash on Counter</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("Online")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === "Online" ? "bg-orange-500/20 border-orange-500 text-orange-500" : "bg-neutral-800 border-white/5 opacity-50"}`}
                    >
                      <span className="font-bold">Pay Online</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-2 block">
                    Special Requests
                  </label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Any allergies or special requests?"
                    className="w-full bg-neutral-800 border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 resize-none h-20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-neutral-400 font-medium">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-extrabold">
                  <span>Total</span>
                  <span className="text-orange-500">
                    ₹{totalPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={placeOrder}
                  className="w-full bg-linear-to-r from-orange-500 to-red-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-transform"
                >
                  {modifyingOrderId ? "Update Order" : "Place Order"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Order Detail Modal */}
      <AnimatePresence>
        {isOrderDetailOpen && recentOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setIsOrderDetailOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-60 bg-neutral-900 rounded-t-3xl max-h-[85vh] overflow-y-auto border-t border-white/10 no-scrollbar"
            >
              <div className="p-6">
                <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-6" />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Order Details</h3>
                    <p className="text-xs text-neutral-500">
                      #{recentOrder._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        recentOrder.status === "Pending"
                          ? "bg-orange-500/20 text-orange-500"
                          : recentOrder.status === "Cooking"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : recentOrder.status === "Cancelled"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      {recentOrder.status}
                    </span>
                    <div className="flex items-center gap-2">
                      {recentOrder.status === "Pending" && (
                        <button
                          onClick={() => handleEditOrder(recentOrder)}
                          className="flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => setIsOrderDetailOpen(false)}
                        className="p-1"
                      >
                        <X size={20} className="text-neutral-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-6">
                  {recentOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-neutral-800/50 rounded-xl p-4">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {item.quantity}× {item.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-500 font-bold">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                          {recentOrder.status === "Pending" && (
                            <button
                              onClick={() =>
                                handleRemoveSingleItem(recentOrder._id, idx)
                              }
                              className="p-1.5 text-neutral-500 hover:text-red-500 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {item.selectedOptions &&
                        item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.selectedOptions.map(
                              (opt: any, oi: number) => (
                                <span
                                  key={oi}
                                  className="text-[10px] bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded"
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

                {/* Order Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Payment</span>
                    <span
                      className={`font-bold ${recentOrder.paymentMethod === "Cash" ? "text-green-500" : "text-blue-500"}`}
                    >
                      {recentOrder.paymentMethod || "Cash"}
                    </span>
                  </div>
                  {recentOrder.note && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                      <p className="text-xs text-yellow-500 font-bold mb-1">
                        NOTE
                      </p>
                      <p className="text-sm text-yellow-200">
                        {recentOrder.note}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-white/5 pt-3">
                    <span>Total</span>
                    <span className="text-orange-500">
                      ₹{recentOrder.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {recentOrder.status === "Pending" && (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setIsOrderDetailOpen(false);
                        cancelOrder();
                      }}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-red-500/10"
                    >
                      <Ban size={18} /> Cancel Order
                    </button>
                  </div>
                )}

                {(recentOrder.status === "Cooking" ||
                  recentOrder.status === "Plating" ||
                  recentOrder.status === "Serving") && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-center">
                    <p className="text-yellow-500 font-bold text-sm">
                      Your order is being prepared ✨
                    </p>
                    <p className="text-yellow-500/60 text-xs mt-1">
                      Cannot modify order once cooking has started
                    </p>
                  </div>
                )}

                {recentOrder.status === "Completed" && (
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                    <CheckCircle
                      size={24}
                      className="text-green-500 mx-auto mb-2"
                    />
                    <p className="text-green-500 font-bold text-sm">
                      Order Completed!
                    </p>
                  </div>
                )}

                {recentOrder.status === "Cancelled" && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                    <Ban size={24} className="text-red-500 mx-auto mb-2" />
                    <p className="text-red-500 font-bold text-sm">
                      Order Cancelled
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setIsPaymentOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-x-4 top-[5%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[460px] bg-neutral-900 rounded-3xl z-60 overflow-hidden border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">
                    Pay ₹{totalPrice.toFixed(2)}
                  </h3>
                  <button
                    onClick={() => setIsPaymentOpen(false)}
                    className="p-1"
                  >
                    <X size={20} className="text-neutral-500" />
                  </button>
                </div>

                {/* Payment Tabs */}
                <div className="flex gap-2 mb-6 bg-neutral-800 rounded-xl p-1">
                  <button
                    onClick={() => setPaymentTab("qr")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentTab === "qr"
                        ? "bg-orange-500 text-white"
                        : "text-neutral-400"
                    }`}
                  >
                    <QrCode size={16} /> UPI / QR
                  </button>
                  <button
                    onClick={() => setPaymentTab("card")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentTab === "card"
                        ? "bg-orange-500 text-white"
                        : "text-neutral-400"
                    }`}
                  >
                    <CreditCard size={16} /> Card
                  </button>
                </div>

                {/* QR Tab */}
                {paymentTab === "qr" && (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-2xl mb-4">
                      {paymentQr ? (
                        <img
                          src={paymentQr}
                          alt="Payment QR"
                          className="w-52 h-52"
                        />
                      ) : (
                        <div className="w-52 h-52 flex items-center justify-center text-black text-sm">
                          QR Loading...
                        </div>
                      )}
                    </div>
                    <p className="text-neutral-400 text-sm text-center mb-2">
                      Scan with any UPI app to pay
                    </p>
                    <p className="text-orange-500 font-bold text-2xl mb-6">
                      ₹{totalPrice.toFixed(2)}
                    </p>
                    <button
                      onClick={handleDemoPayment}
                      disabled={paymentProcessing}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      {paymentProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />{" "}
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} /> I have paid (Demo)
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Card Tab */}
                {paymentTab === "card" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Card Number
                      </label>
                      <input
                        value={cardForm.number}
                        onChange={(e) =>
                          setCardForm({
                            ...cardForm,
                            number: e.target.value
                              .replace(/\D/g, "")
                              .replace(/(\d{4})/g, "$1 ")
                              .trim()
                              .slice(0, 19),
                          })
                        }
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors font-mono tracking-widest"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Cardholder Name
                      </label>
                      <input
                        value={cardForm.name}
                        onChange={(e) =>
                          setCardForm({ ...cardForm, name: e.target.value })
                        }
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Expiry
                        </label>
                        <input
                          value={cardForm.expiry}
                          onChange={(e) => {
                            let v = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            if (v.length >= 3)
                              v = v.slice(0, 2) + "/" + v.slice(2);
                            setCardForm({ ...cardForm, expiry: v });
                          }}
                          className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors font-mono"
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          CVV
                        </label>
                        <input
                          type="password"
                          value={cardForm.cvv}
                          onChange={(e) =>
                            setCardForm({
                              ...cardForm,
                              cvv: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 3),
                            })
                          }
                          className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors font-mono"
                          placeholder="•••"
                          maxLength={3}
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 mt-2">
                      <div className="flex justify-between mb-4 text-sm">
                        <span className="text-neutral-400">Total</span>
                        <span className="font-bold text-orange-500">
                          ₹{totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={handleDemoPayment}
                        disabled={
                          paymentProcessing ||
                          !cardForm.number ||
                          !cardForm.expiry ||
                          !cardForm.cvv
                        }
                        className="w-full bg-linear-to-r from-orange-500 to-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20"
                      >
                        {paymentProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard size={18} /> Pay ₹
                            {totalPrice.toFixed(2)}
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-600 text-center">
                      🔒 This is a demo. No real charges.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
