"use client";

interface RatingPoint {
  date: string;
  rating: number;
}

export interface RatingChartProps {
  history: RatingPoint[];
}

/**
 * Renders an SVG line chart showing the player's rating history over time.
 * Displays a gradient-filled area chart with y-axis ticks and x-axis date labels.
 * Shows a placeholder message when fewer than 2 data points are available.
 */
export default function RatingChart({ history }: RatingChartProps) {
  if (history.length < 2) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center h-48 text-gray-500 text-sm">
        Play more rated games to see your rating chart
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 45 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const ratings = history.map((p) => p.rating);
  const minR = Math.min(...ratings) - 20;
  const maxR = Math.max(...ratings) + 20;
  const rangeR = maxR - minR || 1;

  const points = history.map((p, i) => {
    const x = PAD.left + (i / (history.length - 1)) * plotW;
    const y = PAD.top + plotH - ((p.rating - minR) / rangeR) * plotH;
    return { x, y, ...p };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + plotH} L ${points[0].x} ${PAD.top + plotH} Z`;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    Math.round(minR + (rangeR * i) / (yTicks - 1))
  );

  // X-axis labels (first, middle, last)
  const xLabels = [
    history[0],
    history[Math.floor(history.length / 2)],
    history[history.length - 1],
  ];
  const xPositions = [0, Math.floor(history.length / 2), history.length - 1];

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Rating History</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Grid lines */}
        {yTickValues.map((v) => {
          const y = PAD.top + plotH - ((v - minR) / rangeR) * plotH;
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#374151"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 5}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-500"
                fontSize="10"
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#ratingGradient)" opacity="0.3" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {/* End dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill="#3b82f6"
        />
        {/* X labels */}
        {xLabels.map((p, i) => {
          const idx = xPositions[i];
          const x = PAD.left + (idx / (history.length - 1)) * plotW;
          return (
            <text
              key={i}
              x={x}
              y={H - 5}
              textAnchor="middle"
              className="fill-gray-500"
              fontSize="10"
            >
              {p.date.slice(5)}
            </text>
          );
        })}
        <defs>
          <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
