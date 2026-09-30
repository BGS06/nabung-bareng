import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Tambahkan konfigurasi Viewport untuk PWA (warna tema HP)
export const viewport: Viewport = {
  themeColor: "#1A365D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// 2. Update Metadata dengan info aplikasi Nabung Bareng & Manifest PWA
export const metadata: Metadata = {
  title: "Nabung Bareng",
  description: "Aplikasi tabungan bersama pasangan",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nabung Bareng",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id" // 3. Diubah dari "en" menjadi "id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}