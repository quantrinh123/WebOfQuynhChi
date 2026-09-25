import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Luyện thi Toán THPT",
  description: "Nền tảng tạo đề và luyện thi Toán THPT"
};

export const viewport: Viewport = {
  themeColor: "#0d9488"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
