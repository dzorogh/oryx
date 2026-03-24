import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavRail } from "@/components/layout/nav-rail";
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
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        <NavRail />
        {children}
      </body>
    </html>
  );
}
