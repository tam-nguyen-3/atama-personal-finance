import type { Metadata } from "next";
import { DemoDashboard } from "@/app/components/demo/DemoDashboard";
import { PublicShell } from "@/app/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Interactive demo",
  description: "Explore atama’s accounts, cash flow, transactions, and budgets with read-only sample data.",
};

export default function DemoPage() {
  return <PublicShell current="demo"><DemoDashboard /></PublicShell>;
}
