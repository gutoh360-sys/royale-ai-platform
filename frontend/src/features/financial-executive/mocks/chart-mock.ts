export interface ChartDataPoint {
  date: string;
  revenue: number;
  cashFlow: number;
}

function generateDailyData(baseRevenue: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const dailyRev = baseRevenue / 30;
  const now = new Date("2026-07-27");

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const day = date.getDay();
    const weekendFactor = day === 0 || day === 6 ? 0.55 : 1;
    const noise = 0.75 + Math.random() * 0.5;
    data.push({
      date: date.toISOString().slice(0, 10),
      revenue: Math.round(dailyRev * weekendFactor * noise),
      cashFlow: Math.round(dailyRev * 0.12 * weekendFactor * noise),
    });
  }
  return data;
}

const cache = new Map<string, ChartDataPoint[]>();

export function getFinancialChartData(baseRevenue: number): ChartDataPoint[] {
  const key = `fin-${baseRevenue}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = generateDailyData(baseRevenue);
  cache.set(key, data);
  return data;
}
