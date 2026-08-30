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

export const metadata = {
  title: "Kisan-Dost AI",
  description: "Aap ka zarkhaiz sathi. Pakistani kisano ke liye AI assistant.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon.jpg",
    apple: "/icons/icon.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kisan-Dost AI",
  },
};

export const viewport = {
  themeColor: "#16a34a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
