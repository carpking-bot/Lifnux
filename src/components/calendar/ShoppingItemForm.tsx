"use client";

import type { ShoppingItemDraft, ShoppingPriority } from "@/lib/calendar/shopping";

type ShoppingItemFormProps = {
  mode: "create" | "view" | "edit";
  value: ShoppingItemDraft;
  onChange?: (next: ShoppingItemDraft) => void;
};

const PRIORITY_OPTIONS: ShoppingPriority[] = ["HIGH", "MIDDLE", "LOW"];

export default function ShoppingItemForm({ mode, value, onChange }: ShoppingItemFormProps) {
  const isEditable = mode !== "view";

  const handleChange = (patch: Partial<ShoppingItemDraft>) => {
    if (!onChange) {
      return;
    }
    onChange({ ...value, ...patch });
  };

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
        Name
        <input
          value={value.name}
          onChange={(event) => handleChange({ name: event.target.value })}
          disabled={!isEditable}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100 disabled:opacity-70"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
          Priority
          <select
            value={value.priority}
            onChange={(event) =>
              handleChange({ priority: event.target.value as ShoppingPriority })
            }
            disabled={!isEditable}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100 disabled:opacity-70"
          >
            {PRIORITY_OPTIONS.map((level) => (
              <option
                key={level}
                value={level}
                className="bg-slate-900 text-sky-100"
              >
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
          Price
          {isEditable ? (
            <input
              type="number"
              value={value.price}
              onChange={(event) => handleChange({ price: event.target.value })}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100 disabled:opacity-70"
            />
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100/80">
              {value.price.trim() ? `₩${Number(value.price).toLocaleString()}` : "—"}
            </div>
          )}
        </label>
      </div>

      <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
        Memo
        <textarea
          value={value.memo}
          onChange={(event) => handleChange({ memo: event.target.value })}
          rows={3}
          disabled={!isEditable}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100 disabled:opacity-70"
        />
      </label>
    </div>
  );
}
