import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { VideoQrCount } from '../types';
import { EmptyState } from './EmptyState';

export function VideoQrBarChart({ data }: { data: VideoQrCount[] }) {
  if (data.length === 0) {
    return <EmptyState title="No data to chart yet." description="Generate some QR codes to see statistics here." />;
  }

  const chartData = data.slice(0, 10).map((d) => ({
    label: `${d.video_code}`,
    name: d.video_name,
    count: d.qr_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          formatter={(value) => [value, 'QR codes']}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.name ?? label}
          contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
