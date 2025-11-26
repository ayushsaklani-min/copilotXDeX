import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Web3Provider } from "@/providers/Web3Provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CopilotXDEX 2.0 - AI-Powered Bonding Curve DEX",
  description: "The future of decentralized trading. Trade with bonding curves, earn with GameFi, stay safe with AI security.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-dark-bg-primary text-white`}>
        <Web3Provider>
          <Navigation />
          <main>{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
