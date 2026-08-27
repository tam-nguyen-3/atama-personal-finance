import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  Bar: () => null,
}));

import { DemoDashboard } from "@/app/components/demo/DemoDashboard";

afterEach(() => vi.unstubAllGlobals());

describe("DemoDashboard", () => {
  it("uses fixtures without protected calls or mutation controls", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<DemoDashboard />);
    expect(screen.getByText("Everyday checking")).toBeVisible();
    expect(screen.getByText("Sample data · Read only")).toBeVisible();
    expect(screen.queryByRole("button", { name: /connect|sync|delete|edit|create budget/i })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("moves between accessible demo tabs", () => {
    render(<DemoDashboard />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Cash flow" }), { button: 0, ctrlKey: false });
    expect(screen.getByRole("tab", { name: "Cash flow" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Money in and out")).toBeVisible();
  });

  it("filters sample transactions and returns focus after clearing", () => {
    render(<DemoDashboard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Transactions" }), { button: 0, ctrlKey: false });
    const search = screen.getByLabelText("Search transactions");
    fireEvent.change(search, { target: { value: "not a merchant" } });
    expect(screen.getByText("No matching transactions")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveFocus();
    expect(screen.getByText("Neighborhood Market")).toBeVisible();
  });

  it("links every budget to a read-only detail route", () => {
    render(<DemoDashboard />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Budgets" }), { button: 0, ctrlKey: false });
    expect(screen.getByRole("link", { name: /Groceries/ })).toHaveAttribute("href", "/demo/budget/demo-food");
  });
});
