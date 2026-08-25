import Link from "next/link";
import { demoBudgets } from "@/lib/demo-fixtures";
export default async function DemoBudget({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const budget = demoBudgets.find((item) => item.id === id); if (!budget) return <main className="landing"><h1>Demo budget not found</h1></main>; return <main className="landing"><p className="eyebrow">Read-only demo</p><h1>{budget.name}</h1><p>Monthly limit: ${budget.limit}</p><Link href="/signup">Create your own budget</Link></main>; }
