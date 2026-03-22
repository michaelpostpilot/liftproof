"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadDropzone } from "@/components/csv/upload-dropzone";
import { ValidationPreview } from "@/components/csv/validation-preview";
import { ColumnMapper, type ColumnMapping } from "@/components/csv/column-mapper";
import { detectColumnTypes, type ColumnDetection } from "@/lib/csv-detection";
import { SampleCsvTable } from "@/components/shared/sample-csv-table";
import { createClient } from "@/lib/supabase/client";

type Step = "upload" | "preview" | "confirm" | "uploading" | "success";

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [detectedColumns, setDetectedColumns] = useState<ColumnDetection[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    geoColumn: "",
    dateColumn: "",
    kpiColumns: [],
    spendColumn: null,
    geoGranularity: "state",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-load sample data if ?sample=<filename> or ?sample=true
  useEffect(() => {
    const sampleParam = searchParams.get("sample");
    if (sampleParam && !file) {
      const filename = sampleParam === "true" ? "geo_test_sample.csv" : sampleParam;
      fetch(`/${filename}`)
        .then((res) => res.blob())
        .then((blob) => {
          const sampleFile = new File([blob], filename, { type: "text/csv" });
          handleFileAccepted(sampleFile);
        })
        .catch(() => setError("Failed to load sample data"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleFileAccepted = useCallback((acceptedFile: File) => {
    setFile(acceptedFile);
    setError(null);

    Papa.parse(acceptedFile, {
      preview: 101, // header + 100 rows
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          setError("CSV must have at least a header row and one data row");
          return;
        }

        const hdrs = data[0];
        const rows = data.slice(1).filter((row) => row.some((cell) => cell.trim()));

        setHeaders(hdrs);
        setPreviewRows(rows);

        // Detect column types
        const detected = detectColumnTypes(hdrs, rows);
        setDetectedColumns(detected);

        // Auto-populate mapping from detections
        const geoCol = detected.find((c) => c.detectedType === "geo");
        const dateCol = detected.find((c) => c.detectedType === "date");
        const kpiCols = detected.filter((c) => c.detectedType === "kpi");
        const spendCol = detected.find((c) => c.detectedType === "spend");

        setMapping({
          geoColumn: geoCol?.name || "",
          dateColumn: dateCol?.name || "",
          kpiColumns: kpiCols.map((c) => c.name),
          spendColumn: spendCol?.name || null,
          geoGranularity: geoCol?.geoGranularity || "state",
        });

        setStep("preview");
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });

    // Full parse for row count
    Papa.parse(acceptedFile, {
      complete: (results) => {
        const data = results.data as string[][];
        setAllRows(data.slice(1).filter((row) => row.some((cell) => cell.trim())));
      },
    });
  }, []);

  const handleConfirmUpload = async () => {
    if (!file || !mapping.geoColumn || !mapping.dateColumn || mapping.kpiColumns.length === 0) {
      setError("Please map all required columns");
      return;
    }

    setStep("uploading");
    setUploadProgress(10);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to Supabase Storage
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      setUploadProgress(30);

      const { error: storageError } = await supabase.storage
        .from("csv-uploads")
        .upload(storagePath, file);

      if (storageError) throw new Error(`Upload failed: ${storageError.message}`);
      setUploadProgress(60);

      // Compute date range from parsed data
      const dateColIdx = headers.indexOf(mapping.dateColumn);
      const dates = allRows
        .map((row) => row[dateColIdx])
        .filter(Boolean)
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      // Insert upload metadata
      const { data: upload, error: dbError } = await supabase
        .from("csv_uploads")
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: storagePath,
          file_size_bytes: file.size,
          row_count: allRows.length,
          geo_granularity: mapping.geoGranularity,
          geo_column: mapping.geoColumn,
          date_column: mapping.dateColumn,
          kpi_columns: mapping.kpiColumns,
          spend_column: mapping.spendColumn,
          date_range_start: dates.length > 0 ? dates[0].toISOString().split("T")[0] : null,
          date_range_end: dates.length > 0 ? dates[dates.length - 1].toISOString().split("T")[0] : null,
          validation_status: "valid",
        })
        .select()
        .single();

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      setUploadProgress(100);
      setUploadId(upload.id);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("confirm");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif italic text-4xl text-[#0B1D2E]">Upload Data</h1>
        <p className="text-muted-foreground">
          Upload a CSV with one row per day per geographic region. See the format guide below.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload", "Preview", "Confirm", "Done"].map((label, i) => {
          const stepIdx = { upload: 0, preview: 1, confirm: 2, uploading: 3, success: 3 }[step];
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-[#D4CFC4]" />}
              <div
                className={`flex items-center gap-1.5 ${
                  i <= stepIdx ? "text-[#3D6B42] font-medium" : "text-[#8A8880]"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    i < stepIdx
                      ? "bg-[#7A9E7E] text-white"
                      : i === stepIdx
                      ? "border-2 border-[#7A9E7E] text-[#3D6B42]"
                      : "border border-[#D4CFC4] text-[#8A8880]"
                  }`}
                >
                  {i < stepIdx ? "\u2713" : i + 1}
                </div>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-[#FDEEEA] text-[#E05D3A] rounded-lg px-4 py-3 text-sm border border-[#E05D3A]/20">
          {error}
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <>
          <UploadDropzone onFileAccepted={handleFileAccepted} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Expected CSV Format</CardTitle>
            </CardHeader>
            <CardContent>
              <SampleCsvTable />
            </CardContent>
          </Card>
        </>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <>
          <ValidationPreview
            headers={headers}
            previewRows={previewRows}
            detectedColumns={detectedColumns}
            totalRows={allRows.length}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button onClick={() => setStep("confirm")}>
              Continue to Column Mapping
            </Button>
          </div>
        </>
      )}

      {/* Step: Confirm mapping */}
      {step === "confirm" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Confirm Column Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                detectedColumns={detectedColumns}
                mapping={mapping}
                onMappingChange={setMapping}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("preview")}>
              Back
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={
                !mapping.geoColumn ||
                !mapping.dateColumn ||
                mapping.kpiColumns.length === 0
              }
            >
              Upload & Save
            </Button>
          </div>
        </>
      )}

      {/* Step: Uploading */}
      {step === "uploading" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="font-medium">Uploading and validating your data...</p>
            <Progress value={uploadProgress} className="max-w-md mx-auto" />
          </CardContent>
        </Card>
      )}

      {/* Step: Success */}
      {step === "success" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-[#E8F0E8] flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-[#3D6B42]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-lg">Data uploaded successfully!</p>
              <p className="text-muted-foreground">
                {allRows.length.toLocaleString()} rows &middot; {file?.name}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
              <Button onClick={() => router.push("/experiments/new")}>
                Create Experiment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
