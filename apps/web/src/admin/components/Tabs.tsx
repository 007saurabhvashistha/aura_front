interface TabItem {
  label: string;
  value: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`admin-tabs ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`admin-tab ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
            {typeof tab.count === 'number' && <span className="admin-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
