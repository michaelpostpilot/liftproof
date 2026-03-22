"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CsvUpload } from "@/types/database";

export function UploadCard({ upload }: { upload: CsvUpload }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    const supabase = createClient();

    try {
      // Try to delete from storage (may fail if no DELETE policy — that's OK)
      if (upload.storage_path) {
        await supabase.storage.from("csv-uploads").remove([upload.storage_path]).catch(() => {});
      }

      // Delete the database record (this is what matters)
      const { error } = await supabase.from("csv_uploads").delete().eq("id", upload.id);
      if (error) throw error;

      // Refresh the page to reflect changes
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-3 flex items-center justify-between">
        <div>
          <p className="font-medium">{upload.filename}</p>
          <p className="text-sm text-muted-foreground">
            {upload.row_count?.toLocaleString()} rows
            {upload.geo_granularity && ` \u00B7 ${upload.geo_granularity}`}
            {upload.date_range_start &&
              ` \u00B7 ${upload.date_range_start} to ${upload.date_range_end}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              upload.validation_status === "valid" ? "default" : "secondary"
            }
          >
            {upload.validation_status}
          </Badge>
          {showConfirm ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-[11px] font-semibold text-white bg-[#E05D3A] hover:bg-[#c94d2e] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="text-[11px] font-semibold text-[#8A8880] hover:text-[#0B1D2E] px-2 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-[#8A8880] hover:text-[#E05D3A] transition-colors p-1"
              aria-label="Delete upload"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
