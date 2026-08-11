"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, PenTool } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
}

export default function SignaturePad({
  value,
  onChange,
  height = 140,
  label = "Draw signature",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Initialize canvas stroke style
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#DEFF80"; // Lime color for clean contrast
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // If initial value exists, render it onto canvas
    if (value && isEmpty) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, height);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [height]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    if ("clientX" in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="mono-tag flex items-center gap-1.5 text-xs text-bone-300">
          <PenTool size={12} className="text-lime-400" /> {label}
        </label>
        {!isEmpty && (
          <button
            type="button"
            onClick={clear}
            className="mono-tag flex items-center gap-1 text-[11px] text-bone-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw size={11} /> Clear
          </button>
        )}
      </div>

      <div className="relative rounded-lg border border-ink-600 bg-ink-900/90 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ height: `${height}px`, touchAction: "none" }}
          className="w-full cursor-crosshair block"
        />

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-bone-600">
            Sign here with mouse, finger or stylus
          </div>
        )}
      </div>
    </div>
  );
}
