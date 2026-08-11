"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Undo2, PenTool, Type, Upload, CheckCircle2, Image as ImageIcon } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
  defaultName?: string;
}

const INK_COLORS = [
  { name: "Lime", hex: "#DEFF80" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "White", hex: "#F8FAFC" },
  { name: "Dark", hex: "#0F172A" },
];

const PEN_SIZES = [
  { name: "Fine", value: 1.5 },
  { name: "Medium", value: 2.5 },
  { name: "Thick", value: 4 },
];

const CURSIVE_FONTS = [
  { id: "dancing", label: "Style 1 (Elegant)", font: "'Dancing Script', cursive, serif" },
  { id: "vibes", label: "Style 2 (Classic)", font: "'Great Vibes', cursive, serif" },
  { id: "caveat", label: "Style 3 (Modern)", font: "'Caveat', cursive, sans-serif" },
  { id: "sacramento", label: "Style 4 (Formal)", font: "'Sacramento', cursive, serif" },
];

export default function SignaturePad({
  value,
  onChange,
  height = 150,
  label = "Signature",
  defaultName = "",
}: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [color, setColor] = useState("#DEFF80");
  const [penSize, setPenSize] = useState(2.5);
  const [typedText, setTypedText] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState(CURSIVE_FONTS[0].font);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Load cursive Google fonts dynamically if needed
  useEffect(() => {
    if (typeof document !== "undefined") {
      const id = "google-cursive-fonts";
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap";
        document.head.appendChild(link);
      }
    }
  }, []);

  // Initialize Canvas & redraw initial value if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (value && isEmpty && mode === "draw") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, height);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [height, color, penSize, mode]);

  // Keyboard Ctrl+Z / Cmd+Z shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && mode === "draw") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, mode]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, snapshot]);
  };

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

    saveCanvasState();

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
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

  const undo = () => {
    if (history.length === 0) {
      clear();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory((prev) => prev.slice(0, -1));

    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setIsEmpty(true);
    onChange?.(null);
  };

  // Type Mode Handler: Render cursive typed signature onto canvas
  const renderTypedSignature = (text: string, font: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!text.trim()) {
      setIsEmpty(true);
      onChange?.(null);
      return;
    }

    setIsEmpty(false);
    ctx.fillStyle = color === "#0F172A" ? "#0F172A" : color === "#3B82F6" ? "#3B82F6" : "#DEFF80";
    ctx.font = `38px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.trim(), (rect.width * dpr) / 2, (height * dpr) / 2);

    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  // Upload Mode Handler: Load image file onto canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fit image within bounds
        const scale = Math.min(rect.width / img.width, height / img.height) * 0.85;
        const w = img.width * scale * dpr;
        const h = img.height * scale * dpr;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        setIsEmpty(false);

        const exported = canvas.toDataURL("image/png");
        onChange?.(exported);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2.5">
      {/* Modes & Label */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="mono-tag text-xs text-bone-300">{label}</label>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-ink-600 bg-ink-900 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode("draw");
              clear();
            }}
            className={`mono-tag flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
              mode === "draw"
                ? "bg-lime-400/15 text-lime-400 font-semibold"
                : "text-bone-400 hover:text-bone-200"
            }`}
          >
            <PenTool size={11} /> Draw
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("type");
              if (typedText) renderTypedSignature(typedText, selectedFont);
            }}
            className={`mono-tag flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
              mode === "type"
                ? "bg-lime-400/15 text-lime-400 font-semibold"
                : "text-bone-400 hover:text-bone-200"
            }`}
          >
            <Type size={11} /> Type
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              fileInputRef.current?.click();
            }}
            className={`mono-tag flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
              mode === "upload"
                ? "bg-lime-400/15 text-lime-400 font-semibold"
                : "text-bone-400 hover:text-bone-200"
            }`}
          >
            <Upload size={11} /> Upload
          </button>
        </div>
      </div>

      {/* Mode Controls */}
      {mode === "draw" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            <span className="mono-tag text-[10px] text-bone-400">Ink:</span>
            {INK_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`h-4 w-4 rounded-full border transition-transform ${
                  color === c.hex ? "scale-125 border-lime-400 ring-2 ring-lime-400/30" : "border-ink-500"
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* Pen Size */}
          <div className="flex items-center gap-1.5">
            <span className="mono-tag text-[10px] text-bone-400">Size:</span>
            {PEN_SIZES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setPenSize(p.value)}
                className={`mono-tag px-1.5 py-0.5 text-[10px] rounded border ${
                  penSize === p.value
                    ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                    : "border-ink-600 text-bone-400 hover:text-bone-200"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="mono-tag flex items-center gap-1 text-[11px] text-bone-400 hover:text-lime-300 disabled:opacity-40"
              title="Undo last stroke (Ctrl+Z)"
            >
              <Undo2 size={11} /> Undo
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={isEmpty}
              className="mono-tag flex items-center gap-1 text-[11px] text-bone-400 hover:text-rose-400 disabled:opacity-40"
            >
              <RotateCcw size={11} /> Clear
            </button>
          </div>
        </div>
      )}

      {mode === "type" && (
        <div className="space-y-2 rounded-lg border border-ink-700 bg-ink-900/60 p-3">
          <input
            type="text"
            className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
            placeholder="Type your name to sign..."
            value={typedText}
            onChange={(e) => {
              setTypedText(e.target.value);
              renderTypedSignature(e.target.value, selectedFont);
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono-tag text-[10px] text-bone-400">Font style:</span>
            {CURSIVE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFont(f.font);
                  renderTypedSignature(typedText, f.font);
                }}
                className={`mono-tag rounded border px-2 py-1 text-xs ${
                  selectedFont === f.font
                    ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                    : "border-ink-600 text-bone-400 hover:text-bone-200"
                }`}
                style={{ fontFamily: f.font }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-700 bg-ink-900/60 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-lime-400 shrink-0" />
            <span className="text-xs text-bone-300">
              Upload scanned signature (PNG / JPEG)
            </span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary h-8 px-3 text-xs"
          >
            Choose image file
          </button>
        </div>
      )}

      {/* Canvas Viewport */}
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-bone-500">
            <span>
              {mode === "draw"
                ? "Sign here using mouse, finger or stylus"
                : mode === "type"
                ? "Type your name above to generate signature"
                : "Click upload to select signature image"}
            </span>
            {mode === "draw" && (
              <span className="mono-tag text-[10px] text-bone-600">
                Press Ctrl+Z to undo strokes
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
