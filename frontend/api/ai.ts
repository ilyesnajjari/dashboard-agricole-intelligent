// Simple API wrapper for AI-related endpoints
const baseURL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

export type DemandPlanItem = {
  product_id: number;
  product_name: string;
  quantity_estimate: number;
  price_estimate: number | null;
  low: number;
  high: number;
};

export async function getDemandPlan(date: string, top_n?: number): Promise<{ date: string; items: DemandPlanItem[] }> {
  const url = new URL(baseURL + '/ai/demand-plan/');
  url.searchParams.set('date', date);
  if (top_n !== undefined) url.searchParams.set('top_n', String(top_n));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch demand plan');
  return res.json();
}
