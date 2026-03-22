"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GeoSelectorProps {
  availableGeos: string[];
  selectedGeos: string[];
  onSelectionChange: (geos: string[]) => void;
  label?: string;
}

export function GeoSelector({
  availableGeos,
  selectedGeos,
  onSelectionChange,
  label = "Treatment Geos",
}: GeoSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredGeos = availableGeos.filter((geo) =>
    geo.toLowerCase().includes(search.toLowerCase())
  );

  const unselected = filteredGeos.filter((g) => !selectedGeos.includes(g));
  const controlCount = availableGeos.length - selectedGeos.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="default">{selectedGeos.length} treatment</Badge>
          <Badge variant="outline">{controlCount} control</Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <strong>Treatment</strong> = where your campaign ran (ads, mail, etc.).{" "}
        <strong>Control</strong> = everywhere else &mdash; these are used to
        build the counterfactual (&ldquo;what would have happened without the
        campaign&rdquo;). Aim for more controls than treatment geos.
      </p>

      {selectedGeos.length > 0 && controlCount < selectedGeos.length && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          You have more treatment geos ({selectedGeos.length}) than controls ({controlCount}).
          This can reduce accuracy. The synthetic control works best with more
          control geos available as donors.
        </div>
      )}

      {selectedGeos.length > 0 && controlCount >= selectedGeos.length && controlCount < 3 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          Fewer than 3 control geos may reduce model accuracy. The synthetic control needs enough
          donor geos to build a reliable counterfactual.
        </div>
      )}

      <Input
        placeholder="Search geos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([...availableGeos])}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([])}
        >
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Available = Control */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Control &mdash; no campaign ({unselected.length})
          </p>
          <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
            {unselected.map((geo) => (
              <button
                key={geo}
                type="button"
                onClick={() => onSelectionChange([...selectedGeos, geo])}
                className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
              >
                {geo}
                <span className="text-xs text-muted-foreground ml-1">&rarr;</span>
              </button>
            ))}
            {unselected.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                All geos selected as treatment
              </p>
            )}
          </div>
        </div>

        {/* Selected = Treatment */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Treatment &mdash; campaign ran here ({selectedGeos.length})
          </p>
          <div className="border rounded-lg border-blue-200 bg-blue-50/50 max-h-60 overflow-y-auto p-2 space-y-1">
            {selectedGeos
              .filter((g) => !search || g.toLowerCase().includes(search.toLowerCase()))
              .map((geo) => (
                <button
                  key={geo}
                  type="button"
                  onClick={() =>
                    onSelectionChange(selectedGeos.filter((g) => g !== geo))
                  }
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  {geo}
                  <span className="text-xs text-gray-400">&times;</span>
                </button>
              ))}
            {selectedGeos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Click geos on the left to mark them as treatment
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
