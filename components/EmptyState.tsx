export default function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-ink/15 bg-white/40 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 3.5h9a2 2 0 012 2V17H8a3 3 0 01-3-3V3.5z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M5 17a2 2 0 002-2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.5 7h6M6.5 9.5h6M6.5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-soft">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
