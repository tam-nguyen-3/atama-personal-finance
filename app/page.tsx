import Link from "next/link";

export default function LandingPage() {
  return <main className="landing"><p className="eyebrow">atama</p><h1>Personal finance, made calm.</h1><p>Connect Sandbox accounts, understand spending, and build budgets that fit your life.</p><div className="landing-actions"><Link href="/demo">Explore the demo</Link><Link href="/signup">Create an account</Link><Link href="/login">Log in</Link></div></main>;
}
