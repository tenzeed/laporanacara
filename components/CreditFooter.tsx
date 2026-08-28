export default function CreditFooter() {
  return (
    <footer className="mt-14 flex justify-center pb-2">
      <a
        href="https://www.instagram.com/mukhibcan?igsi=MTdxaDgyejF3YTdwYg=="
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-ink-soft/60 transition hover:text-brand"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
        </svg>
        <span className="font-medium">mukhibcan</span>
      </a>
    </footer>
  );
}
