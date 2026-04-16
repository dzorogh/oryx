import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavRail } from "@/components/layout/nav-rail";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oryx BMS",
  description: "3D container packing visualization"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} ${inter.variable} antialiased pb-16 sm:pb-0`}>
        <NavRail />
        {children}
        <Toaster position="top-center" duration={1000} />
      </body>
    </html>
  );
}
