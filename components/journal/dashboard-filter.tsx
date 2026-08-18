"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DashboardFilter({ topics }: { topics: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = query.trim();
      if (normalized) params.set("q", normalized); else params.delete("q");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchParams]);

  function updateTopic(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("topic"); else params.set("topic", value);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos or topics" className="h-10 rounded-lg pl-9" /></div>
      <Select value={searchParams.get("topic") ?? "all"} onValueChange={updateTopic}><SelectTrigger className="h-10 w-full rounded-lg"><SlidersHorizontal className="size-4 text-muted-foreground" /><SelectValue placeholder="All topics" /></SelectTrigger><SelectContent><SelectItem value="all">All topics</SelectItem>{topics.map((topic) => <SelectItem value={topic} key={topic}>{topic}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}
