"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRDisplayProps {
  value: string;
  size?: number;
  showDownload?: boolean;
  className?: string;
}

export function QRDisplay({
  value,
  size = 128,
  showDownload = true,
  className,
}: QRDisplayProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qrcode-${Date.now()}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        ref={svgRef}
        className="p-3 bg-white rounded-xl shadow-sm"
        style={{ width: size + 24, height: size + 24 }}
      >
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {showDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="text-xs gap-1.5 h-8"
        >
          <Download className="w-3 h-3" />
          Download QR
        </Button>
      )}
    </div>
  );
}


