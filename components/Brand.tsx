export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-paper">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 2.5h8.5A1.5 1.5 0 0112 4v9.5H4.5A2.5 2.5 0 012 11V2.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M4.5 13.5A2.5 2.5 0 0012 11" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4.5 5.5h5M4.5 7.7h5M4.5 9.9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold italic tracking-tight text-ink">
          Buku Acara
        </span>
      )}
    </div>
  );
}
