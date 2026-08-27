import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "atama — Personal finance, made calm", template: "%s · atama" },
  description:
    "A calm personal finance dashboard for connected accounts, cash flow, transactions, and budgets.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
