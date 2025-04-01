import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { WalletProviderWrapper } from "@/components/WalletProviderWrapper";
import { AuthProvider } from "@/components/AuthContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gigster (client)",
  description: "A powerful Solana-based GIGs application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="bottom-right" />
        <WalletProviderWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
