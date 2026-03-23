import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { NavRail } from "@/components/layout/nav-rail";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oryx BMS",
  description: "3D container packing visualization"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${manrope.className} ${manrope.variable} antialiased`}>
        <NavRail />
        {children}
      </body>
    </html>
  );
}
