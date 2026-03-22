"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnDetection } from "@/lib/csv-detection";

interface ValidationPreviewProps {
  headers: string[];
  previewRows: string[][];
  detectedColumns: ColumnDetection[];
  totalRows: number;
}

export function ValidationPreview({
  headers,
  previewRows,
  detectedColumns,
  totalRows,
}: ValidationPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Rows</p>
              <p className="font-semibold">{totalRows.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Columns</p>
              <p className="font-semibold">{headers.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Detected Geo</p>
              <p className="font-semibold">
                {detectedColumns.find((c) => c.detectedType === "geo")?.name || "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Detected Date</p>
              <p className="font-semibold">
                {detectedColumns.find((c) => c.detectedType === "date")?.name || "None"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column detection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detected Columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {detectedColumns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm"
              >
                <span className="font-medium">{col.name}</span>
                <TypeBadge type={col.detectedType} granularity={col.geoGranularity} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            LiftProof auto-detects column types. <strong>Geo</strong> and <strong>Date</strong> columns
            are required. <strong>KPI</strong> columns are numeric metrics to measure.{" "}
            <strong>Spend</strong> columns enable iROAS calculation. You can adjust these in the next step.
          </p>
          {(!detectedColumns.find((c) => c.detectedType === "geo") ||
            !detectedColumns.find((c) => c.detectedType === "date")) && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <strong>Heads up:</strong> We couldn&apos;t auto-detect a{" "}
              {!detectedColumns.find((c) => c.detectedType === "geo") ? "geo" : "date"} column.
              You can manually assign columns in the next step.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview (first 10 rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="whitespace-nowrap">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TypeBadge({
  type,
  granularity,
}: {
  type: string;
  granularity?: string;
}) {
  const labels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    geo: { label: granularity ? `Geo (${granularity})` : "Geo", variant: "default" },
    date: { label: "Date", variant: "default" },
    kpi: { label: "KPI", variant: "secondary" },
    spend: { label: "Spend", variant: "secondary" },
    unknown: { label: "Unknown", variant: "outline" },
  };
  const config = labels[type] || labels.unknown;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
