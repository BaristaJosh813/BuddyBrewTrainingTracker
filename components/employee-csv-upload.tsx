"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { validateEmployeeCsvAction } from "@/app/admin/actions";

const templateHeaders = "first_name,last_name,role_title,hire_date,primary_store_code,starting_position";

export function EmployeeCsvUpload() {
  const [csv, setCsv] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setFileError("Please drop a CSV file.");
      return;
    }

    try {
      const text = await file.text();
      setCsv(text);
      setFileName(file.name);
      setFileError(null);
    } catch {
      setFileError("We couldn't read that file. Please try again.");
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void loadFile(file);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void loadFile(file);
    }
  }

  return (
    <form action={validateEmployeeCsvAction}>
      <label
        className={`csv-dropzone ${isDragging ? "dragging" : ""}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept=".csv,text/csv"
          className="csv-file-input"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <span className="csv-dropzone-title">Drag and drop a CSV file here</span>
        <span className="muted">or click to choose a file and we&apos;ll load it into the upload form below.</span>
        {fileName ? <span className="csv-dropzone-meta">Loaded file: {fileName}</span> : null}
        {fileError ? <span className="csv-dropzone-error">{fileError}</span> : null}
      </label>

      <label className="field full">
        <span>Paste CSV</span>
        <textarea
          name="csv"
          onChange={(event) => setCsv(event.target.value)}
          rows={8}
          placeholder={templateHeaders}
          value={csv}
        />
      </label>

      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="button primary" type="submit">
          Validate upload
        </button>
        <button className="button secondary" onClick={() => fileInputRef.current?.click()} type="button">
          Choose CSV
        </button>
        <a
          className="button secondary"
          download="employee-upload-template.csv"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(`${templateHeaders}\n`)}`}
        >
          Download template
        </a>
      </div>
    </form>
  );
}
