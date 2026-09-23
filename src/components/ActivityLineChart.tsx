import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyActivityPoint } from '../services/statsService';

export function ActivityLineChart({ data }: { data: DailyActivityPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: format(parseISO(d.date), 'MMM d') }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 13 }} />
        <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2.5} dot={false} name="QR codes generated" />
      </LineChart>
    </ResponsiveContainer>
  );
}
