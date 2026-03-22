"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";

interface UploadDropzoneProps {
  onFileAccepted: (file: File) => void;
  isLoading?: boolean;
}

export function UploadDropzone({ onFileAccepted, isLoading }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/tab-separated-values": [".tsv"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isLoading,
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Drop your CSV here</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse (max 50MB)
              </p>
            </>
          )}
          <div className="text-xs text-gray-400 mt-3 text-center space-y-0.5">
            <p>Required: a <strong className="text-gray-500">date</strong> column, a <strong className="text-gray-500">geo</strong> column (state codes, DMA, or ZIP), at least one numeric <strong className="text-gray-500">KPI</strong> column</p>
            <p>Optional: a <strong className="text-gray-500">spend</strong> column to calculate iROAS</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
