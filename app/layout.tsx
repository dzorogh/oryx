import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { NavRail } from "@/components/layout/nav-rail";
import { SidebarAsideProvider } from "@/components/layout/sidebar-aside-context";
import { CatalogScopeProvider } from "@/features/store/catalog-scope-context";
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

const sidebarCollapseInitScript = `(function(){try{var v=window.localStorage.getItem('sidebar-aside-collapsed');document.documentElement.setAttribute('data-sidebar-collapsed', v==='true'?'true':'false');}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable} antialiased pb-16 sm:pb-0`}>
        <Script
          id="sidebar-collapse-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: sidebarCollapseInitScript }}
        />
        <SidebarAsideProvider>
          <CatalogScopeProvider>
            <NavRail />
            {children}
          </CatalogScopeProvider>
        </SidebarAsideProvider>
        <Toaster position="top-center" duration={1000} />
      </body>
    </html>
  );
}
