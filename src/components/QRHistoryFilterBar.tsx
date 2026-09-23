import { Search } from 'lucide-react';
import type { QrHistoryFilters } from '../services/qrService';

interface QRHistoryFilterBarProps {
  filters: QrHistoryFilters;
  onChange: (filters: QrHistoryFilters) => void;
}

export function QRHistoryFilterBar({ filters, onChange }: QRHistoryFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search video, tracking ID, or payload..."
          aria-label="Search QR history"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-xs font-medium text-slate-500">
          From
        </label>
        <input
          id="date-from"
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-xs font-medium text-slate-500">
          To
        </label>
        <input
          id="date-to"
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-order" className="text-xs font-medium text-slate-500">
          Sort
        </label>
        <select
          id="sort-order"
          value={filters.sortOrder ?? 'desc'}
          onChange={(e) => onChange({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
