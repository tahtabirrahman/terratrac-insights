import { useState } from "react";
import pdfAsset from "@/assets/portfolio-pdf.asset.json";

const FILE_NAME = "terratrac-insights__Data_Analytics_Portfolio.pdf";

export function DownloadPdfButton() {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function handleDownload() {
    setState("working");
    try {
      const res = await fetch(pdfAsset.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Empty file");

      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = FILE_NAME;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      setState("idle");
    } catch (err) {
      console.error("PDF download failed", err);
      setState("error");
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {state === "error" && (
        <span className="hidden text-[11px] text-warn sm:inline">
          Unable to download the PDF. Please try again.
        </span>
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === "working"}
        className="inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-[12px] font-semibold text-teal-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-[13px]"
      >
        <span aria-hidden="true">{state === "working" ? "⏳" : "↓"}</span>
        {state === "working"
          ? "Generating PDF..."
          : state === "error"
            ? "Retry download"
            : "Download PDF"}
      </button>
    </div>
  );
}
