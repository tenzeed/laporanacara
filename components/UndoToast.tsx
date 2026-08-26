"use client";

export default function UndoToast({
  message,
  duration = 5000,
  onUndo,
}: {
  message: string;
  duration?: number;
  onUndo: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:bottom-8">
      <div className="relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-full bg-ink pl-4 pr-1.5 py-1.5 text-paper shadow-pop animate-slide-up">
        <span className="flex-1 truncate py-1 text-sm">{message}</span>
        <button
          onClick={onUndo}
          className="shrink-0 rounded-full bg-paper/15 px-3.5 py-2 text-xs font-semibold transition hover:bg-paper/25"
        >
          Urungkan
        </button>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-paper/20">
          <div
            className="h-full origin-left bg-gold"
            style={{ animation: `shrink ${duration}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}
