import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type CartItem = {
  id: string | number;
  cart_id: string | number;
  item_type: "book" | "gift";
  item_id: string | number;
  enabled: boolean;
  // joined
  title?: string;
  image_url?: string | null;
  price?: number | null;
};

async function getOrCreateActiveCart(userId: string): Promise<string | number | null> {
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("carts")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: created, error } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active", expires_at: expiresAt })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Error creando carrito:", error);
    return null;
  }
  return created?.id ?? null;
}

async function addItemInternal(
  itemType: "book" | "gift",
  itemId: string | number,
  userId: string,
  cartId: string | number | null,
): Promise<{ ok: boolean; duplicate?: boolean; taken?: boolean }> {
  let cid = cartId;
  if (!cid) cid = await getOrCreateActiveCart(userId);
  if (!cid) return { ok: false };

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id")
    .eq("cart_id", cid)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing?.id) return { ok: false, duplicate: true };

  const table = itemType === "book" ? "books" : "gifts";
  const { data: current } = await supabase
    .from(table)
    .select("id, status, price")
    .eq("id", itemId)
    .maybeSingle();
  if (!current || current.status !== "available") return { ok: false, taken: true };

  const { data: reserved, error: reserveErr } = await supabase
    .from(table)
    .update({
      status: "reserved",
      reserved_by: userId,
      reserved_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("status", "available")
    .select("id, price")
    .maybeSingle();
  if (reserveErr || !reserved) return { ok: false, taken: true };

  const { error: insertErr } = await supabase.from("cart_items").insert({
    cart_id: cid,
    item_type: itemType,
    item_id: itemId,
    price: reserved.price ?? current.price,
    enabled: true,
  });
  if (insertErr) {
    await supabase
      .from(table)
      .update({ status: "available", reserved_by: null, reserved_at: null })
      .eq("id", itemId)
      .eq("reserved_by", userId);
    return { ok: false };
  }
  return { ok: true };
}


export function useCart() {
  const [userId, setUserId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | number | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (cid?: string | number | null) => {
    const id = cid ?? cartId;
    if (!id) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data: rows } = await supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", id);
    if (!rows) {
      setItems([]);
      setLoading(false);
      return;
    }
    const bookIds = rows.filter((r: any) => r.item_type === "book").map((r: any) => r.item_id);
    const giftIds = rows.filter((r: any) => r.item_type === "gift").map((r: any) => r.item_id);
    const [booksRes, giftsRes] = await Promise.all([
      bookIds.length
        ? supabase.from("books").select("id,title,image_url,price").in("id", bookIds)
        : Promise.resolve({ data: [] as any[] }),
      giftIds.length
        ? supabase.from("gifts").select("id,title,image_url,price").in("id", giftIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bookMap = new Map((booksRes.data ?? []).map((b: any) => [String(b.id), b]));
    const giftMap = new Map((giftsRes.data ?? []).map((g: any) => [String(g.id), g]));
    const merged: CartItem[] = rows.map((r: any) => {
      const src = r.item_type === "book"
        ? bookMap.get(String(r.item_id))
        : giftMap.get(String(r.item_id));
      return {
        ...r,
        title: src?.title,
        image_url: src?.image_url,
        price: src?.price,
      };
    });
    setItems(merged);
    setLoading(false);
  }, [cartId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (uid) {
        const cid = await getOrCreateActiveCart(uid);
        if (!mounted) return;
        setCartId(cid);
        await refresh(cid);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const syncUid = session?.user?.id;
        if (syncUid) setUserId(syncUid);
      }
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const cid = await getOrCreateActiveCart(uid);
        setCartId(cid);
        await refresh(cid);

        // Process any pending item saved before login redirect
        if (event === "SIGNED_IN") {
          try {
            const raw = localStorage.getItem("pendingItem");
            if (raw) {
              localStorage.removeItem("pendingItem");
              const parsed = JSON.parse(raw) as {
                id: string | number;
                type: "book" | "gift";
              };
              const res = await addItemInternal(
                parsed.type,
                parsed.id,
                uid,
                cid,
              );
              if (res.ok) {
                await refresh(cid);
              }
              window.dispatchEvent(
                new CustomEvent("cart:pending-processed", { detail: res }),
              );
            }
          } catch {
            /* noop */
          }
        }
      } else {
        setCartId(null);
        setItems([]);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = useCallback(
    async (
      itemType: "book" | "gift",
      itemId: string | number,
    ): Promise<{ ok: boolean; duplicate?: boolean; needsAuth?: boolean; taken?: boolean }> => {
      if (!userId) return { ok: false, needsAuth: true };
      let cid = cartId;
      if (!cid) {
        cid = await getOrCreateActiveCart(userId);
        setCartId(cid);
      }
      const res = await addItemInternal(itemType, itemId, userId, cid);
      if (res.ok) await refresh(cid);
      return res;
    },
    [userId, cartId, refresh],
  );


  const removeItem = useCallback(
    async (id: string | number) => {
      // Find the item to know which table to revert
      const target = items.find((i) => String(i.id) === String(id));
      await supabase.from("cart_items").delete().eq("id", id);
      if (target) {
        const table = target.item_type === "book" ? "books" : "gifts";
        await supabase
          .from(table)
          .update({ status: "available", reserved_by: null, reserved_at: null })
          .eq("id", target.item_id)
          .eq("reserved_by", userId);
      }
      // If cart becomes empty, mark/delete the cart record
      if (cartId) {
        const { data: remaining } = await supabase
          .from("cart_items")
          .select("id")
          .eq("cart_id", cartId)
          .limit(1);
        if (!remaining || remaining.length === 0) {
          await supabase.from("carts").delete().eq("id", cartId);
          setCartId(null);
          setItems([]);
          return;
        }
      }
      await refresh();
    },
    [refresh, items, userId, cartId],
  );

  const toggleEnabled = useCallback(
    async (id: string | number, value: boolean) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, enabled: value } : i)));
      await supabase.from("cart_items").update({ enabled: value }).eq("id", id);
    },
    [],
  );

  const enabledCount = items.filter((i) => i.enabled).length;
  const totalCount = items.length;
  const totalEnabled = items
    .filter((i) => i.enabled)
    .reduce((s, i) => s + Number(i.price ?? 0), 0);

  return {
    userId,
    items,
    loading,
    enabledCount,
    totalCount,
    totalEnabled,
    addItem,
    removeItem,
    toggleEnabled,
    refresh,
  };
}
