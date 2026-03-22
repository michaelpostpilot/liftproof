"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SAMPLE_DATA = [
  { date: "2025-01-01", geo: "CA", orders: "142", revenue: "8,540", ad_spend: "1,200" },
  { date: "2025-01-01", geo: "TX", orders: "98", revenue: "5,880", ad_spend: "950" },
  { date: "2025-01-01", geo: "NY", orders: "121", revenue: "7,260", ad_spend: "1,100" },
  { date: "2025-01-02", geo: "CA", orders: "156", revenue: "9,360", ad_spend: "1,200" },
  { date: "2025-01-02", geo: "TX", orders: "103", revenue: "6,180", ad_spend: "950" },
];

const COLUMN_NOTES = [
  {
    name: "date",
    badge: "Required",
    variant: "default" as const,
    description:
      "One row per date per geo. Accepted formats: YYYY-MM-DD, MM/DD/YYYY, M/D/YY. Daily granularity recommended.",
  },
  {
    name: "geo",
    badge: "Required",
    variant: "default" as const,
    description:
      "Geographic identifier. US state codes (CA, TX), Nielsen DMA codes (501, 803), ZIP3, or ZIP5.",
  },
  {
    name: "orders / revenue",
    badge: "KPI",
    variant: "secondary" as const,
    description:
      "At least one numeric metric you want to measure lift on (e.g., orders, revenue, sessions, conversions).",
  },
  {
    name: "ad_spend",
    badge: "Optional",
    variant: "outline" as const,
    description:
      "Include if you want to compute iROAS (incremental return on ad spend) and CPIA (cost per incremental acquisition).",
  },
];

export function SampleCsvTable() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">date</TableHead>
              <TableHead className="text-xs font-semibold">geo</TableHead>
              <TableHead className="text-xs font-semibold">orders</TableHead>
              <TableHead className="text-xs font-semibold">revenue</TableHead>
              <TableHead className="text-xs font-semibold">ad_spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_DATA.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-mono">{row.date}</TableCell>
                <TableCell className="text-xs font-mono">{row.geo}</TableCell>
                <TableCell className="text-xs font-mono">{row.orders}</TableCell>
                <TableCell className="text-xs font-mono">{row.revenue}</TableCell>
                <TableCell className="text-xs font-mono">{row.ad_spend}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        {COLUMN_NOTES.map((col) => (
          <div key={col.name} className="flex items-start gap-2 text-sm">
            <Badge variant={col.variant} className="shrink-0 mt-0.5 text-xs">
              {col.badge}
            </Badge>
            <span>
              <span className="font-medium font-mono text-xs">{col.name}</span>
              {" \u2014 "}
              <span className="text-muted-foreground">{col.description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
