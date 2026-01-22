"use client";

import { useState } from "react";
import type { CalendarLabel } from "@/lib/calendar/types";

type LabelBarProps = {
  labels: CalendarLabel[];
  onAdd: (data: Omit<CalendarLabel, "id">) => void;
  onUpdate: (id: string, patch: Partial<CalendarLabel>) => void;
  onDelete: (id: string) => void;
};

export default function LabelBar({ labels, onAdd, onUpdate, onDelete }: LabelBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#38bdf8");

  return (
    <aside className="max-h-[42vh] min-h-[240px] overflow-y-auto rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
          Labels
        </h3>
        <button
          type="button"
          onClick={() => setIsEditing((value) => !value)}
          className="text-xs uppercase tracking-[0.3em] text-sky-100/60 transition hover:text-white"
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {isEditing ? (
                <input
                  value={label.name}
                  onChange={(event) =>
                    onUpdate(label.id, { name: event.target.value })
                  }
                  className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-sky-100"
                />
              ) : (
                <span className="text-xs uppercase tracking-[0.3em] text-sky-100/80">
                  {label.name}
                </span>
              )}
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={label.color}
                  onChange={(event) =>
                    onUpdate(label.id, { color: event.target.value })
                  }
                  className="h-6 w-6 rounded-full border border-white/10 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => onDelete(label.id)}
                  className="text-[0.65rem] uppercase tracking-[0.2em] text-rose-200/80"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {isEditing ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
            Add Label
          </p>
          <div className="mt-3 grid gap-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Label name"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-100"
            />
            <div className="flex items-center justify-between">
              <input
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
                className="h-8 w-10 rounded-lg border border-white/10 bg-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newName.trim()) {
                    return;
                  }
                  onAdd({ name: newName.trim(), color: newColor });
                  setNewName("");
                }}
                className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-100"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
