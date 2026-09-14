"use client";

import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type DashboardView = "grid" | "list";

export function DashboardViewSwitch({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (view: DashboardView) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function choose(view: DashboardView) {
    onChange(view);
    window.localStorage.setItem("shubhojeets-videos:view", view);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("shubhojeets-videos:view");
    if (saved === "grid" || saved === "list") onChange(saved);
  }, [onChange]);

  return (
    <div
      className="hidden items-center rounded-lg border border-border bg-card p-1 sm:flex"
      aria-label="Dashboard layout"
    >
      <Button
        type="button"
        size="icon-sm"
        variant={mounted && value === "grid" ? "secondary" : "ghost"}
        onClick={() => choose("grid")}
        aria-label="Use card grid"
      >
        <LayoutGrid />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={mounted && value === "list" ? "secondary" : "ghost"}
        onClick={() => choose("list")}
        aria-label="Use compact list"
      >
        <List />
      </Button>
    </div>
  );
}
