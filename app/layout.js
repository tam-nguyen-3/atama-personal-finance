import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BudgetProvider } from "./components/BudgetContext";
import { TransactionProvider } from "./components/TransactionContext";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "atama — Personal finance dashboard",
  description:
    "A calm personal finance dashboard for connected accounts, cash flow, transactions, and budgets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>
        <BudgetProvider>
          <TransactionProvider>{children}</TransactionProvider>
        </BudgetProvider>
      </body>
    </html>
  );
}
