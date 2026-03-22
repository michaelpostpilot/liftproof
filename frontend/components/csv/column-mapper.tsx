"use client";

import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnDetection, GeoGranularity } from "@/lib/csv-detection";

export interface ColumnMapping {
  geoColumn: string;
  dateColumn: string;
  kpiColumns: string[];
  spendColumn: string | null;
  geoGranularity: GeoGranularity;
}

interface ColumnMapperProps {
  detectedColumns: ColumnDetection[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({
  detectedColumns,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const allColumns = detectedColumns.map((c) => c.name);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Geo Column */}
        <div className="space-y-2">
          <Label>
            Geographic Column *
            <InfoTooltip content="The column that identifies each geographic unit. Each unique value becomes a geo you can assign as treatment or control." />
          </Label>
          <Select
            value={mapping.geoColumn}
            onValueChange={(v) => v && onMappingChange({ ...mapping, geoColumn: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select geo column" />
            </SelectTrigger>
            <SelectContent>
              {allColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Geo Granularity */}
        <div className="space-y-2">
          <Label>
            Geo Granularity
            <InfoTooltip content="State = US 2-letter codes (CA, TX). DMA = Nielsen market areas (3-digit codes like 501, 803). ZIP3/ZIP5 = postal code prefixes or full codes. Pick Custom if your geos don't match these." />
          </Label>
          <Select
            value={mapping.geoGranularity}
            onValueChange={(v) =>
              v && onMappingChange({ ...mapping, geoGranularity: v as GeoGranularity })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="state">US States</SelectItem>
              <SelectItem value="dma">Nielsen DMA</SelectItem>
              <SelectItem value="zip3">ZIP3</SelectItem>
              <SelectItem value="zip5">ZIP5</SelectItem>
              <SelectItem value="unknown">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Column */}
        <div className="space-y-2">
          <Label>
            Date Column *
            <InfoTooltip content="The column with dates for each observation. Supported formats: YYYY-MM-DD, MM/DD/YYYY, M/D/YY. Daily data works best." />
          </Label>
          <Select
            value={mapping.dateColumn}
            onValueChange={(v) => v && onMappingChange({ ...mapping, dateColumn: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date column" />
            </SelectTrigger>
            <SelectContent>
              {allColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spend Column (optional) */}
        <div className="space-y-2">
          <Label>
            Spend Column (optional)
            <InfoTooltip content="If included, LiftProof can calculate iROAS (incremental return on ad spend) and CPIA (cost per incremental acquisition). Leave as None if you don't have spend data." />
          </Label>
          <Select
            value={mapping.spendColumn || "__none__"}
            onValueChange={(v) =>
              v && onMappingChange({
                ...mapping,
                spendColumn: v === "__none__" ? null : v,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {allColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Columns */}
      <div className="space-y-2">
        <Label>
          KPI Columns * (select all that apply)
          <InfoTooltip content="Select the numeric outcome columns you want to measure lift on. The first selected column becomes your primary KPI. Common examples: orders, revenue, conversions, sessions." />
        </Label>
        <div className="flex flex-wrap gap-2">
          {allColumns
            .filter(
              (col) =>
                col !== mapping.geoColumn &&
                col !== mapping.dateColumn &&
                col !== mapping.spendColumn
            )
            .map((col) => {
              const isSelected = mapping.kpiColumns.includes(col);
              const detection = detectedColumns.find((d) => d.name === col);
              const isNumeric =
                detection?.detectedType === "kpi" ||
                detection?.detectedType === "spend";

              return (
                <button
                  key={col}
                  onClick={() => {
                    const newKpis = isSelected
                      ? mapping.kpiColumns.filter((k) => k !== col)
                      : [...mapping.kpiColumns, col];
                    onMappingChange({ ...mapping, kpiColumns: newKpis });
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : isNumeric
                      ? "bg-white hover:bg-gray-50 border-gray-300"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  }`}
                >
                  {col}
                </button>
              );
            })}
        </div>
        {mapping.kpiColumns.length === 0 && (
          <p className="text-sm text-red-500">Select at least one KPI column</p>
        )}
      </div>
    </div>
  );
}
