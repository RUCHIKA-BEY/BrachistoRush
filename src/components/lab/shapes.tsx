import type { Shape } from "@/lib/racers";

/** Draw a racer token: every racer has a unique shape so colour is never the only cue. */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, r: number) {
  ctx.beginPath();
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case "square":
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      break;
    case "triangle":
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r, y + r * 0.75);
      ctx.lineTo(x - r, y + r * 0.75);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r * 1.15);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case "star": {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r * 1.2 : r * 0.55;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "hexagon":
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r * 1.05;
        const py = y + Math.sin(a) * r * 1.05;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }
}

export function ShapeIcon({ shape, color, size = 14 }: { shape: Shape; color: string; size?: number }) {
  const s = size;
  const c = s / 2;
  const r = s * 0.36;
  let d = "";
  switch (shape) {
    case "circle":
      return (
        <svg width={s} height={s} aria-hidden="true">
          <circle cx={c} cy={c} r={r} fill={color} />
        </svg>
      );
    case "square":
      d = `M${c - r * 0.85} ${c - r * 0.85}h${r * 1.7}v${r * 1.7}h${-r * 1.7}z`;
      break;
    case "triangle":
      d = `M${c} ${c - r * 1.1}L${c + r} ${c + r * 0.75}L${c - r} ${c + r * 0.75}z`;
      break;
    case "diamond":
      d = `M${c} ${c - r * 1.15}L${c + r} ${c}L${c} ${c + r * 1.15}L${c - r} ${c}z`;
      break;
    case "star":
      d =
        Array.from({ length: 10 }, (_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 === 0 ? r * 1.25 : r * 0.55;
          return `${i ? "L" : "M"}${(c + Math.cos(a) * rr).toFixed(2)} ${(c + Math.sin(a) * rr).toFixed(2)}`;
        }).join("") + "z";
      break;
    case "hexagon":
      d =
        Array.from({ length: 6 }, (_, i) => {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          return `${i ? "L" : "M"}${(c + Math.cos(a) * r * 1.1).toFixed(2)} ${(c + Math.sin(a) * r * 1.1).toFixed(2)}`;
        }).join("") + "z";
      break;
  }
  return (
    <svg width={s} height={s} aria-hidden="true">
      <path d={d} fill={color} />
    </svg>
  );
}
