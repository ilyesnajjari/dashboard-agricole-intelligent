import React, { useState } from 'react';
import { getDemandPlan, DemandPlanItem } from '../api/ai';

export default function PlanDemandePage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [topN, setTopN] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DemandPlanItem[]>([]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await getDemandPlan(date, topN);
      setItems(data.items);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Plan de Demande (IA)</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Date:
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Top N (optionnel):
          <input type="number" min={1} value={topN ?? ''} onChange={(e) => setTopN(e.target.value ? Number(e.target.value) : undefined)} />
        </label>
        <button onClick={load} disabled={loading}>Charger</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>Produit</th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>Quantité estimée (kg)</th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>Borne basse</th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>Borne haute</th>
            <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: 8 }}>Prix estimé/kg (€)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.product_id}>
              <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.product_name}</td>
              <td style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'right', padding: 8 }}>{it.quantity_estimate.toFixed(2)}</td>
              <td style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'right', padding: 8 }}>{it.low.toFixed(2)}</td>
              <td style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'right', padding: 8 }}>{it.high.toFixed(2)}</td>
              <td style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'right', padding: 8 }}>{it.price_estimate != null ? it.price_estimate.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
