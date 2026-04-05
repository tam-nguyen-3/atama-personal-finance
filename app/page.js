"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [linkToken, setLinkToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch("/api/plaid/accounts"),
        fetch("/api/plaid/transactions"),
      ]);
      if (!accountsRes.ok || !transactionsRes.ok) {
        throw new Error("Failed to fetch data");
      }
      const [accountsData, transactionsData] = await Promise.all([
        accountsRes.json(),
        transactionsRes.json(),
      ]);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function createLinkToken() {
      try {
        const res = await fetch("/api/plaid/create-link-token", {
          method: "POST",
        });
        const data = await res.json();
        if (data.link_token) setLinkToken(data.link_token);
      } catch (err) {
        console.error("Error creating link token:", err);
      }
    }
    createLinkToken();
  }, []);

  const onPlaidSuccess = useCallback(
    async (publicToken, metadata) => {
      try {
        setError(null);
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata.institution?.name || "Unknown Bank",
          }),
        });
        if (!res.ok) throw new Error("Failed to exchange token");
        await fetchData();
      } catch (err) {
        setError(err.message);
      }
    },
    [fetchData]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  const handleDisconnect = async (itemId) => {
    try {
      setError(null);
      const res = await fetch(`/api/plaid/item?item_id=${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const accountsByInstitution = useMemo(() => {
    const grouped = {};
    for (const account of accounts) {
      const key = account.institution_name;
      if (!grouped[key]) grouped[key] = { accounts: [], item_id: account.item_id };
      grouped[key].accounts.push(account);
    }
    return grouped;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (txn) =>
        txn.merchant_name?.toLowerCase().includes(q) ||
        txn.name?.toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    for (const txn of transactions) {
      if (txn.amount <= 0) continue;
      const category =
        txn.personal_finance_category?.primary || "UNCATEGORIZED";
      totals[category] = (totals[category] || 0) + txn.amount;
    }
    return Object.entries(totals)
      .map(([category, total]) => ({
        category: category.replace(/_/g, " "),
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  ];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
        <button
          onClick={() => open()}
          disabled={!ready}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Connect a Bank
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-3 text-gray-500">Loading...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No accounts connected yet.</p>
          <p>Click &quot;Connect a Bank&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Accounts + Spending */}
          <div className="space-y-6">
            {/* Connected Accounts */}
            <section>
              <h2 className="text-lg font-semibold mb-3">Connected Accounts</h2>
              <div className="space-y-4">
                {Object.entries(accountsByInstitution).map(
                  ([institution, { accounts: accts, item_id }]) => (
                    <div key={item_id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{institution}</h3>
                        <button
                          onClick={() => handleDisconnect(item_id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Disconnect
                        </button>
                      </div>
                      <div className="space-y-2">
                        {accts.map((acct) => (
                          <div
                            key={acct.account_id}
                            className="flex justify-between text-sm"
                          >
                            <div>
                              <span>{acct.name}</span>
                              <span className="text-gray-400 ml-2 text-xs uppercase">
                                {acct.subtype || acct.type}
                              </span>
                            </div>
                            <span className="font-mono">
                              ${acct.balances?.current?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "---"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* Spending Breakdown */}
            {categoryBreakdown.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Spending by Category</h2>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={categoryBreakdown.length * 36 + 20}>
                    <BarChart
                      data={categoryBreakdown}
                      layout="vertical"
                      margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>

          {/* Right column: Transactions */}
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  Transactions{" "}
                  <span className="text-gray-400 font-normal text-sm">
                    ({filteredTransactions.length})
                  </span>
                </h2>
                <input
                  type="text"
                  placeholder="Search by merchant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Merchant</th>
                      <th className="px-4 py-2 hidden md:table-cell">Category</th>
                      <th className="px-4 py-2 hidden lg:table-cell">Account</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((txn, i) => (
                        <tr key={txn.transaction_id || i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">{txn.date}</td>
                          <td className="px-4 py-2">
                            <div>{txn.merchant_name || txn.name}</div>
                            <div className="text-xs text-gray-400 lg:hidden">
                              {txn.institution_name}
                            </div>
                          </td>
                          <td className="px-4 py-2 hidden md:table-cell text-gray-500">
                            {txn.personal_finance_category?.primary?.replace(/_/g, " ") || "---"}
                          </td>
                          <td className="px-4 py-2 hidden lg:table-cell text-gray-500">
                            {txn.institution_name}
                          </td>
                          <td
                            className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                              txn.amount > 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {txn.amount > 0 ? "-" : "+"}$
                            {Math.abs(txn.amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
