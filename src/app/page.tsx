"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChefHat,
  ShoppingBasket,
  ShieldCheck,
  ArrowRight,
  Table,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-outfit">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 max-w-4xl"
      >
        <span className="bg-orange-500/10 text-orange-500 px-6 py-2 rounded-full font-black text-sm tracking-widest uppercase mb-8 inline-block border border-orange-500/20">
          Restaurant SaaS Platform
        </span>
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-tight">
          NEX-CREW <br />
          <span className="bg-linear-to-r from-orange-500 via-red-500 to-amber-500 bg-clip-text text-transparent">
            ORDERING.
          </span>
        </h1>
        <p className="text-neutral-500 text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-medium">
          The future of restaurant operations. QR-based ordering, real-time
          kitchen tracking, and powerful business insights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/table/1">
            <motion.div
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="bg-neutral-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl group hover:border-orange-500/30 transition-all"
            >
              <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                <Table className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                CUSTOMER SIDE{" "}
                <ArrowRight size={20} className="text-orange-500" />
              </h3>
              <p className="text-neutral-500 text-sm">
                Scan QR and order instantly from table. No apps required.
              </p>
            </motion.div>
          </Link>

          <Link href="/kitchen">
            <motion.div
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="bg-neutral-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl group hover:border-yellow-500/30 transition-all"
            >
              <div className="w-16 h-16 bg-yellow-500 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                <ChefHat className="text-black" size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                KITCHEN DASH <ChefHat size={20} className="text-yellow-500" />
              </h3>
              <p className="text-neutral-500 text-sm">
                Real-time order tracking for chefs. Update status with one tap.
              </p>
            </motion.div>
          </Link>

          <Link href="/admin">
            <motion.div
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="bg-neutral-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl group hover:border-blue-500/30 transition-all"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                <ShieldCheck className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                ADMIN PANEL <ArrowRight size={20} className="text-blue-500" />
              </h3>
              <p className="text-neutral-500 text-sm">
                Manage menu, view reports, and generate table QR codes.
              </p>
            </motion.div>
          </Link>
        </div>

        <div className="mt-20 flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-2 font-black text-2xl">
            ⚡ NEXT.JS
          </div>
          <div className="flex items-center gap-2 font-black text-2xl">
            📦 MONGODB
          </div>
          <div className="flex items-center gap-2 font-black text-2xl">
            🔗 SOCKET.IO
          </div>
          <div className="flex items-center gap-2 font-black text-2xl">
            🎨 TAILWIND
          </div>
        </div>
      </motion.div>
    </div>
  );
}
