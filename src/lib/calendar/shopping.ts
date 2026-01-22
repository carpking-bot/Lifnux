export type ShoppingPriority = "HIGH" | "MIDDLE" | "LOW";

export type ShoppingItem = {
  id: string;
  name: string;
  priority: ShoppingPriority;
  price?: number;
  memo?: string;
  createdAt: string;
};

export type ShoppingItemDraft = {
  name: string;
  priority: ShoppingPriority;
  price: string;
  memo: string;
};

function createShoppingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `shop-${crypto.randomUUID()}`;
  }
  return `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createShoppingItem(draft: ShoppingItemDraft) {
  const parsedPrice = draft.price.trim() === "" ? undefined : Number(draft.price);
  const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;
  return {
    id: createShoppingId(),
    name: draft.name.trim(),
    priority: draft.priority,
    price,
    memo: draft.memo.trim() || undefined,
    createdAt: new Date().toISOString(),
  } satisfies ShoppingItem;
}
