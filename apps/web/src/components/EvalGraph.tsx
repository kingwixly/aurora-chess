"use client";

interface EvalPoint {
  ply: number;
  eval: number; // centipawns from white's perspective
  mate: number | null;
}

interface EvalGraphProps {
  points: EvalPoint[];
  currentPly: number;
  onClickPly: (ply: number) => void;
}

function clampEval(cp: number): number {
  return Math.max(-500, Math.min(500, cp));
}

function evalToY(cp: number, height: number): number {
  const clamped = clampEval(cp);
  // Map -500..+500 to height..0 (higher eval = higher on graph)
  return ((500 - clamped) / 1000) * height;
}

/**
 * Renders an SVG graph of engine evaluation over the course of a game,
 * with filled areas for white/black advantage and a clickable ply marker.
 *
 * @param props - {@link EvalGraphProps}
 * @returns The evaluation graph, or null when no data points exist.
 */
export default function EvalGraph({ points, currentPly, onClickPly }: EvalGraphProps) {
  if (points.length === 0) return null;

  const width = 600;
  const height = 120;
  const padding = { left: 30, right: 10, top: 5, bottom: 5 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const maxPly = Math.max(points.length, 1);

  function plyToX(ply: number): number {
    return padding.left + (ply / maxPly) * graphW;
  }

  function yForEval(cp: number): number {
    return padding.top + evalToY(cp, graphH);
  }

  const midY = yForEval(0);

  // Build path for the eval line
  const pathPoints = points.map((p) => {
    const x = plyToX(p.ply);
    const evalVal = p.mate !== null ? (p.mate > 0 ? 500 : -500) : p.eval;
    const y = yForEval(evalVal);
    return { x, y, evalVal };
  });

  // Area fill: white advantage (above midline) and black advantage (below)
  const linePath = pathPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // White fill: area between line and midline where eval > 0
  const whiteAreaPath =
    `M${pathPoints[0].x},${midY} ` +
    pathPoints.map((p) => `L${p.x},${Math.min(p.y, midY)}`).join(" ") +
    ` L${pathPoints[pathPoints.length - 1].x},${midY} Z`;

  const blackAreaPath =
    `M${pathPoints[0].x},${midY} ` +
    pathPoints.map((p) => `L${p.x},${Math.max(p.y, midY)}`).join(" ") +
    ` L${pathPoints[pathPoints.length - 1].x},${midY} Z`;

  // Current ply marker
  const currentX = plyToX(currentPly);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ply = Math.round(((x - padding.left) / graphW) * maxPly);
    const clamped = Math.max(0, Math.min(points.length, ply));
    onClickPly(clamped);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-pointer"
        style={{ height: "120px" }}
        onClick={handleClick}
      >
        {/* White area fill */}
        <path d={whiteAreaPath} fill="rgba(255,255,255,0.15)" />
        {/* Black area fill */}
        <path d={blackAreaPath} fill="rgba(0,0,0,0.3)" />

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={width - padding.right}
          y2={midY}
          stroke="#4b5563"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Eval line */}
        <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="1.5" />

        {/* Current ply marker */}
        {currentPly > 0 && currentPly <= points.length && (
          <line
            x1={currentX}
            y1={padding.top}
            x2={currentX}
            y2={height - padding.bottom}
            stroke="#f59e0b"
            strokeWidth="1.5"
            opacity="0.7"
          />
        )}

        {/* Y-axis labels */}
        <text x="2" y={padding.top + 10} fill="#9ca3af" fontSize="9">
          +5
        </text>
        <text x="2" y={midY + 3} fill="#9ca3af" fontSize="9">
          0
        </text>
        <text x="2" y={height - padding.bottom - 2} fill="#9ca3af" fontSize="9">
          -5
        </text>
      </svg>
    </div>
  );
}
