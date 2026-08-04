"use client";

export interface ActivityChartProps {
  activity: { date: string; count: number }[];
}

/**
 * Renders a vertical bar chart showing the player's game activity
 * over the last 30 days, with hover tooltips for individual days.
 */
export default function ActivityChart({ activity }: ActivityChartProps) {
  if (activity.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Activity (30 days)</h3>
        <p className="text-gray-500 text-sm">No recent games</p>
      </div>
    );
  }

  const maxCount = Math.max(...activity.map((a) => a.count));

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Activity (30 days)</h3>
      <div className="flex items-end gap-1 h-24">
        {activity.map((a) => {
          const height = maxCount > 0 ? (a.count / maxCount) * 100 : 0;
          return (
            <div key={a.date} className="flex-1 group relative">
              <div
                className="bg-blue-500 hover:bg-blue-400 rounded-t transition-colors w-full"
                style={{ height: `${height}%`, minHeight: a.count > 0 ? "4px" : "0" }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10">
                {a.date.slice(5)}: {a.count} games
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
