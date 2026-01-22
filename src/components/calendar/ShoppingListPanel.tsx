"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShoppingItem, ShoppingItemDraft, ShoppingPriority } from "@/lib/calendar/shopping";
import { createShoppingItem } from "@/lib/calendar/shopping";
import ShoppingListModal from "@/components/calendar/ShoppingListModal";
import ShoppingItemForm from "@/components/calendar/ShoppingItemForm";
import AutoFitText from "@/components/calendar/AutoFitText";

type PriorityStyle = {
  label: ShoppingPriority;
  chip: string;
};

const PRIORITY_STYLES: Record<ShoppingPriority, PriorityStyle> = {
  HIGH: { label: "H", chip: "bg-rose-400/20 text-rose-200 border-rose-300/40" },
  MIDDLE: { label: "M", chip: "bg-amber-300/20 text-amber-100 border-amber-200/40" },
  LOW: { label: "L", chip: "bg-sky-400/20 text-sky-100 border-sky-300/40" },
};

const EMPTY_DRAFT: ShoppingItemDraft = {
  name: "",
  priority: "LOW",
  price: "",
  memo: "",
};

const STORAGE_KEY = "lifnux.shoppingList";

export default function ShoppingListPanel() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [createDraft, setCreateDraft] = useState<ShoppingItemDraft>(EMPTY_DRAFT);
  const [editDraft, setEditDraft] = useState<ShoppingItemDraft>(EMPTY_DRAFT);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailEditing, setIsDetailEditing] = useState(false);

  const canAdd = createDraft.name.trim().length > 0;

  const sortedItems = useMemo(() => {
    const priorityOrder: Record<ShoppingPriority, number> = {
      HIGH: 0,
      MIDDLE: 1,
      LOW: 2,
    };
    return [...items].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const priceA = a.price ?? Number.POSITIVE_INFINITY;
      const priceB = b.price ?? Number.POSITIVE_INFINITY;
      return priceA - priceB;
    });
  }, [items]);

  const toDraft = (item: ShoppingItem): ShoppingItemDraft => ({
    name: item.name,
    priority: item.priority,
    price: item.price === undefined ? "" : String(item.price),
    memo: item.memo ?? "",
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setCreateDraft(EMPTY_DRAFT);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditDraft(toDraft(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openDetail = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditDraft(toDraft(item));
    setIsDetailEditing(false);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setIsDetailEditing(false);
  };

  const handleComplete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingItem?.id === id) {
      setEditingItem(null);
      setIsModalOpen(false);
      setIsDetailOpen(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setItems(parsed as ShoppingItem[]);
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage write failures
    }
  }, [items]);

  return (
    <aside className="max-h-[42vh] min-h-[240px] overflow-y-auto rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
            Shopping List
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
              {items.length}
            </span>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-sky-100/70 transition hover:text-white"
            >
              +
            </button>
          </div>
        </div>

      <div className="mt-4 grid gap-3 overflow-x-hidden">
        {sortedItems.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
            NO SHOPPING ITEMS.
          </p>
        ) : null}
        {sortedItems.map((item) => {
          const style = PRIORITY_STYLES[item.priority];
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/5"
            >
              <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left">
                <span
                  className={`flex h-6 w-10 items-center justify-center rounded-full border text-[0.6rem] uppercase tracking-[0.3em] ${style.chip}`}
                >
                  {style.label}
                </span>
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className="min-w-0 text-left transition hover:text-white"
                >
                  <AutoFitText
                    text={item.name}
                    minFontPx={8}
                    maxFontPx={12}
                    className="text-center uppercase tracking-[0.2em] text-sky-100/80"
                  />
                </button>
                <label
                  className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    onChange={() => handleComplete(item.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span className="h-4 w-4 rounded border border-cyan-200/30 bg-slate-950/60 shadow-[0_0_0_1px_rgba(56,189,248,0.12)] transition peer-checked:border-cyan-200/60 peer-checked:bg-cyan-300/30 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200/30" />
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="pointer-events-none absolute h-3 w-3 text-cyan-200 opacity-0 transition peer-checked:opacity-100"
                  >
                    <path
                      d="M4 8.2 6.6 10.8 12 5.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <ShoppingListModal
        isOpen={isModalOpen}
        mode={editingItem ? "edit" : "create"}
        draft={editingItem ? editDraft : createDraft}
        onChange={editingItem ? setEditDraft : setCreateDraft}
        onClose={closeModal}
        onSave={() => {
          if (editingItem) {
            if (!editDraft.name.trim()) {
              return;
            }
            const parsedPrice = editDraft.price.trim() === "" ? undefined : Number(editDraft.price);
            const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;
            setItems((prev) =>
              prev.map((entry) =>
                entry.id === editingItem.id
                  ? {
                      ...entry,
                      name: editDraft.name.trim(),
                      priority: editDraft.priority,
                      price,
                      memo: editDraft.memo.trim() || undefined,
                    }
                  : entry
              )
            );
          } else {
            if (!canAdd) {
              return;
            }
            setItems((prev) => [createShoppingItem(createDraft), ...prev]);
            setCreateDraft(EMPTY_DRAFT);
          }
          setEditingItem(null);
          closeModal();
        }}
        canSave={editingItem ? editDraft.name.trim().length > 0 : canAdd}
        editingItem={editingItem}
      />

      {isDetailOpen && editingItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1624]/95 p-6 text-sky-100 shadow-[0_20px_60px_rgba(5,20,35,0.7)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                  Shopping Item
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {editingItem.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-sky-100/70 transition hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              <ShoppingItemForm
                mode={isDetailEditing ? "edit" : "view"}
                value={editDraft}
                onChange={isDetailEditing ? setEditDraft : undefined}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {isDetailEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDraft(toDraft(editingItem));
                      setIsDetailEditing(false);
                    }}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={editDraft.name.trim().length === 0}
                    onClick={() => {
                      if (!editDraft.name.trim()) {
                        return;
                      }
                      const parsedPrice =
                        editDraft.price.trim() === "" ? undefined : Number(editDraft.price);
                      const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;
                      setItems((prev) =>
                        prev.map((entry) =>
                          entry.id === editingItem.id
                            ? {
                                ...entry,
                                name: editDraft.name.trim(),
                                priority: editDraft.priority,
                                price,
                                memo: editDraft.memo.trim() || undefined,
                              }
                            : entry
                        )
                      );
                      setEditingItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: editDraft.name.trim(),
                              priority: editDraft.priority,
                              price,
                              memo: editDraft.memo.trim() || undefined,
                            }
                          : prev
                      );
                      setIsDetailEditing(false);
                    }}
                    className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDetailEditing(true)}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
