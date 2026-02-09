import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "NEX-CREW | Digital Menu & Ordering System",
  description: "Modern QR-based restaurant food ordering web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans antialiased bg-[#0a0a0a] text-white`}
        style={{
          fontFamily:
            "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        <CartProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#171717",
                color: "#fff",
                border: "1px solid #404040",
              },
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}
