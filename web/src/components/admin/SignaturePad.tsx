"use client";

import { useRef, useState } from "react";

// Plain canvas signature capture -- no library. This is a simple visual
// capture for the internal walkthrough worksheet, not a compliance-grade
// e-signature (no separate consent disclosure / audit trail beyond the
// stored image + timestamp).
export default function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = getCtx();
    const { x, y } = pointerPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#182420";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function end() {
    drawing.current = false;
    if (hiddenInputRef.current && canvasRef.current) {
      hiddenInputRef.current.value = canvasRef.current.toDataURL("image/png");
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
    setHasDrawn(false);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={360}
        height={110}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{ border: "1.5px solid var(--line)", borderRadius: 10, background: "#fff", touchAction: "none", width: "100%", maxWidth: 360 }}
      />
      <input ref={hiddenInputRef} type="hidden" name={name} />
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" className="btn ghost" onClick={clear} style={{ padding: "4px 14px", fontSize: 12 }}>
          Clear
        </button>
        {!hasDrawn && <span style={{ fontSize: 12, color: "#9aa49d" }}>Sign above</span>}
      </div>
    </div>
  );
}
