"use client";

import Modal from "./Modal";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Hapus",
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-full border border-ink/15 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
        >
          Batal
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`flex-1 rounded-full py-2.5 text-sm font-medium text-white transition ${
            danger ? "bg-rust hover:bg-rust/90" : "bg-brand hover:bg-brand-dark"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
