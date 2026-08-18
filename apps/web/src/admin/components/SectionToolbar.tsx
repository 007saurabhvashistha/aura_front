import type { ReactNode } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface SectionToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  actions?: ReactNode;
}

// Shared list toolbar: search + filter chips + optional actions. Used across all
// control-plane resource pages so filtering behaves predictably everywhere.
export function SectionToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters = [],
  activeFilter,
  onFilterChange,
  actions,
}: SectionToolbarProps) {
  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-search">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      {filters.length > 0 && onFilterChange && (
        <div className="admin-toolbar-filters" role="tablist">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`admin-filter-chip ${activeFilter === filter.value ? 'is-active' : ''}`}
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {actions && <div className="admin-toolbar-actions">{actions}</div>}
    </div>
  );
}
