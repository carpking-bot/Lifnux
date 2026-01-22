"use client";

import type { ShoppingItem, ShoppingItemDraft } from "@/lib/calendar/shopping";
import ShoppingItemForm from "@/components/calendar/ShoppingItemForm";

type ShoppingListModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  draft: ShoppingItemDraft;
  onChange: (next: ShoppingItemDraft) => void;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  editingItem?: ShoppingItem | null;
};

export default function ShoppingListModal({
  isOpen,
  mode,
  draft,
  onChange,
  onClose,
  onSave,
  canSave,
  editingItem,
}: ShoppingListModalProps) {
  if (!isOpen) {
    return null;
  }

  const title = mode === "create" ? "Add Item" : "Edit Item";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1624]/95 p-6 text-sky-100 shadow-[0_20px_60px_rgba(5,20,35,0.7)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Shopping List
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            {mode === "edit" && editingItem ? (
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-sky-100/60">
                {editingItem.name}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-sky-100/70 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6">
          <ShoppingItemForm
            mode={mode}
            value={draft}
            onChange={onChange}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
