export interface InventoryChartStockPoint {
  date: string;
  itemsInStock: number;
  immobilizedCapital: number;
}

function generateDailyData(baseItems: number, baseCapital: number): InventoryChartStockPoint[] {
  const data: InventoryChartStockPoint[] = [];
  const dailyItems = baseItems / 30;
  const dailyCapital = baseCapital / 30;
  const now = new Date("2026-07-27");

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const day = date.getDay();
    const weekendFactor = day === 0 || day === 6 ? 0.98 : 1;
    const noise = 0.9 + Math.random() * 0.2;
    data.push({
      date: date.toISOString().slice(0, 10),
      itemsInStock: Math.round(baseItems * 0.3 + dailyItems * (29 - i) * weekendFactor * noise),
      immobilizedCapital: Math.round(baseCapital * 0.3 + dailyCapital * (29 - i) * weekendFactor * noise),
    });
  }
  return data;
}

const cache = new Map<string, InventoryChartStockPoint[]>();

export function getInventoryChartData(baseItems: number, baseCapital: number): InventoryChartStockPoint[] {
  const key = `inv-${baseItems}-${baseCapital}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = generateDailyData(baseItems, baseCapital);
  cache.set(key, data);
  return data;
}
