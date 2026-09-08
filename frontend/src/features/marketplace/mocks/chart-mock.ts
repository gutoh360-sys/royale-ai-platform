/*
  Mock temporário para séries temporais dos gráficos da página de detalhe.
  Substituir por dados reais da API quando disponível.
  NÃO misturar com engines.
*/

export interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

function generateDailyData(
  baseRevenue: number,
  baseOrders: number,
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const dailyRev = baseRevenue / 30;
  const dailyOrd = baseOrders / 30;
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const day = date.getDay();
    const weekendFactor = day === 0 || day === 6 ? 0.55 : 1;
    data.push({
      date: date.toISOString().slice(0, 10),
      revenue: Math.round(dailyRev * weekendFactor),
      orders: Math.round(dailyOrd * weekendFactor),
    });
  }
  return data;
}

const cache = new Map<string, ChartDataPoint[]>();

export function getChartData(baseRevenue: number, baseOrders: number): ChartDataPoint[] {
  const key = `${baseRevenue}-${baseOrders}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = generateDailyData(baseRevenue, baseOrders);
  cache.set(key, data);
  return data;
}
