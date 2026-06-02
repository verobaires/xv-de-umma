import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseAnonKey } from "@/lib/supabaseClient";
import LoginModal from "@/components/LoginModal";
import CartPanel from "@/components/CartPanel";
import { useCart } from "@/hooks/useCart";
import UserMenu from "@/components/UserMenu";

type Category = {
  id: string | number;
  name: string;
  slug?: string | null;
};

type Book = {
  id: string | number;
  title: string;
  author?: string | null;
  price?: number | null;
  image_url?: string | null;
  cover_url?: string | null;
  status?: string | null;
  destacado?: boolean | null;
  category_id?: string | number | null;
  description?: string | null;
};

const HERO_LEFT =
  "https://lyesyoofgicfezabtnns.supabase.co/storage/v1/object/public/assets/ui/hero-izquierdo.webp";
const HERO_RIGHT =
  "https://lyesyoofgicfezabtnns.supabase.co/storage/v1/object/public/assets/ui/hero-derecho.jpg";

function formatPrice(n?: number | null) {
  const value = Number(n ?? 0);
  const [intPart, decPart] = value.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${withThousands},${decPart}`;
}

function truncateDescription(text?: string | null, max = 120) {
  if (!text) return "";
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd();
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | number | "all">("all");
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [userMeta, setUserMeta] = useState<{ name: string | null; avatar: string | null }>({
    name: null,
    avatar: null,
  });

  const cart = useCart();

  const updateBookStatus = (bookId: string | number, status: string) => {
    setBooks((prev) => prev.map((b) => (String(b.id) === String(bookId) ? { ...b, status } : b)));
  };

  const fetchCatalog = useCallback(async () => {
    // Wait for Supabase to finish processing any OAuth hash / restore session
    // before fetching, so RLS sees the correct auth state.
    await supabase.auth.getSession();
    const [cats, bks] = await Promise.all([
      supabase.from("book_categories").select("*"),
      supabase.from("books").select("*"),
    ]);
    if (!cats.error && cats.data) setCategories(cats.data as Category[]);
    if (!bks.error && Array.isArray(bks.data)) {
      setBooks(bks.data as Book[]);
    }
  }, []);

  const handleConfirmOrder = async (message: string | null): Promise<boolean> => {
    const enabledItems = cart.items.filter((i) => i.enabled === true);
    if (enabledItems.length === 0 || !cart.userId) {
      toast.error("No hay items seleccionados");
      return false;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: cart.userId,
        total: cart.totalEnabled,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order?.id) {
      toast.error("Error al crear el pedido");
      return false;
    }

    const orderId = order.id;

    const { error: itemsError } = await supabase.from("order_items").insert(
      enabledItems.map((item) => ({
        order_id: orderId,
        item_id: item.item_id,
        item_type: item.item_type,
        price: item.price,
      })),
    );

    if (itemsError) {
      toast.error("Error al guardar los items");
      return false;
    }

    if (message && message.trim()) {
      const { error: msgError } = await supabase
        .from("messages")
        .insert({ order_id: orderId, message: message.trim() });
      if (msgError) {
        console.error(msgError);
      }
    }

    try {
      const response = await fetch(
        "https://lyesyoofgicfezabtnns.supabase.co/functions/v1/create-mp-preference",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            order_id: orderId,
            items: enabledItems.map((i) => ({ title: i.title, price: i.price })),
          }),
        },
      );

      const data = (await response.json()) as { init_point?: string };
      const initPoint = data?.init_point;

      if (!response.ok || !initPoint || !String(initPoint).trim()) {
        toast.error("Error al conectar con Mercado Pago");
        return false;
      }

      window.location.href = initPoint;
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error al conectar con Mercado Pago");
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u) {
        const meta = u.user_metadata as Record<string, unknown> | undefined;
        setUserMeta({
          name: (meta?.full_name as string) || (meta?.name as string) || u.email || null,
          avatar: (meta?.avatar_url as string) || (meta?.picture as string) || null,
        });
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata as Record<string, unknown> | undefined;
        const name =
          (meta?.full_name as string) ||
          (meta?.name as string) ||
          session.user.email ||
          "";
        setUserMeta({
          name: name || null,
          avatar: (meta?.avatar_url as string) || (meta?.picture as string) || null,
        });
        if (event === "SIGNED_IN") {
          setLoginOpen(false);
          toast.success(`¡Bienvenido/a, ${name}!`, { duration: 3000 });
        }
      } else {
        setUserMeta({ name: null, avatar: null });
      }
    });
    const onPending = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        ok: boolean;
        duplicate?: boolean;
        taken?: boolean;
      };
      if (detail?.duplicate) {
        toast.error("Este libro ya está en tu carrito");
      } else if (detail?.taken) {
        toast.error("Este libro ya fue seleccionado");

      } else if (detail?.ok) {
        const raw = localStorage.getItem("pendingItem");
        if (raw) {
          const parsed = JSON.parse(raw) as { id: string | number; type: string };
          updateBookStatus(parsed.id, "reserved");
        }
        toast.success("Añadido al carrito");
        setCartOpen(true);
      }

    };
    window.addEventListener("cart:pending-processed", onPending);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("cart:pending-processed", onPending);
    };
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    const onFocus = () => {
      void fetchCatalog();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCatalog]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (!status) return;
    if (status === "approved") {
      toast.success("¡Tu regalo fue registrado! Muchas gracias 💜", { duration: 4000 });
      setCartOpen(true);
    } else if (status === "failure") {
      toast.error("Hubo un problema con el pago. Tu carrito sigue guardado.");
      setCartOpen(true);
    } else if (status === "pending") {
      toast.error("Tu pago está pendiente de confirmación.");
      setCartOpen(true);
    }
    history.replaceState({}, "", window.location.pathname);
  }, []);

  const filtered = useMemo(() => {
    return books.filter((b) => {
      const matchesCat = selectedCat === "all" || b.category_id === selectedCat;
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [books, selectedCat, query]);

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A2E]/95 backdrop-blur border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="shrink-0 text-sm font-semibold tracking-[0.25em] text-[#B8860B] sm:text-base"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            LOS XV DE UMMA
          </a>
          <div className="relative flex-1 max-w-xl mx-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar libros, autores..."
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-[#B8860B] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative shrink-0 rounded-full p-2 text-white hover:text-[#B8860B] transition-colors"
            aria-label="Carrito"
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.totalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8B0000] text-[10px] font-semibold text-white">
                {cart.totalCount}
              </span>
            )}
          </button>
          <UserMenu
            userId={cart.userId}
            name={userMeta.name}
            avatarUrl={userMeta.avatar}
            onRequireAuth={() => setLoginOpen(true)}
          />
        </div>
      </header>

      {/* HERO */}
      <section className="relative mt-[60px] h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-2">
          <div
            className="bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_LEFT})` }}
          />
          <div
            className="bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_RIGHT})` }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#B8860B] sm:text-xs">
            Regalale a Umma nuevas historias para sus 15
          </p>
          <h1
            className="text-4xl font-bold leading-tight text-white sm:text-6xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            El Arte de{" "}
            <span
              className="italic text-[#B8860B]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Leer
            </span>
          </h1>
          <p className="mt-5 max-w-[500px] text-sm leading-relaxed text-white/90">
            Donde cada volumen es una obra maestra esperando ser descubierta.
            Umma sueña con llenar su biblioteca de historias, aventuras y
            personajes inolvidables. Su gran deseo para este cumpleaños es
            recibir 15 libros para sus 15 años.
          </p>
        </div>
      </section>

      {/* CATEGORY FILTERS */}
      <section className="bg-[#1A1A2E] border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCat("all")}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                selectedCat === "all"
                  ? "bg-[#B8860B] border-[#B8860B] text-black"
                  : "border-white/20 text-white/80 hover:border-[#B8860B] hover:text-[#B8860B]"
              }`}
            >
              <Star className="h-3 w-3" fill="currentColor" />
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  selectedCat === c.id
                    ? "bg-[#B8860B] border-[#B8860B] text-black"
                    : "border-white/20 text-white/80 hover:border-[#B8860B] hover:text-[#B8860B]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2
          className="mb-10 text-center text-3xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          La Colección
        </h2>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/50">
            Aún no hay libros disponibles. Volvé pronto.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
            {filtered.map((book, i) => {
              const isFeatured = book.destacado || i === 0;
              const isReserved = book.status === "reserved";
              const isPaid = book.status === "paid";
              const image = book.image_url || book.cover_url || "";
              return (
                <article
                  key={book.id}
                  className={`group relative overflow-hidden rounded-xl border border-white/5 bg-[#22223a] transition-all ${
                    isReserved ? "opacity-60" : ""
                  }`}
                >
                  <div className="relative h-[280px] w-full overflow-hidden bg-black/30">
                    {image ? (
                      <img
                        src={image}
                        alt={book.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/30">
                        Sin imagen
                      </div>
                    )}

                    {isFeatured && !isPaid && (
                      <span className="absolute left-2 top-2 rounded border border-[#B8860B] bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B8860B]">
                        Destacado
                      </span>
                    )}

                    {isPaid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="text-sm font-semibold uppercase tracking-widest text-white">
                          Comprado
                        </span>
                      </div>
                    )}

                    {!isReserved && !isPaid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={async () => {
                            if (!cart.userId) {
                              localStorage.setItem(
                                "pendingItem",
                                JSON.stringify({ id: book.id, type: "book" }),
                              );
                              await supabase.auth.signInWithOAuth({
                                provider: "google",
                                options: { redirectTo: window.location.origin },
                              });
                              return;
                            }
                            const res = await cart.addItem("book", book.id);
                            if (res.duplicate) {
                              toast.error("Este libro ya está en tu carrito");
                            } else if (res.taken) {
                              toast.error("Este libro ya fue seleccionado por otro invitado");
                            } else if (res.ok) {
                              updateBookStatus(book.id, "reserved");
                              toast.success("Añadido al carrito");
                              setCartOpen(true);
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-[#8B0000] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#a00000] transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Añadir
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3
                      className="line-clamp-2 text-sm font-bold text-[#B8860B]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="mt-1 text-xs italic text-white/50">
                        {book.author}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-bold text-[#B8860B]">
                      {formatPrice(book.price)}
                    </p>
                    {book.description && (
                      <p className="mt-2 text-xs italic text-white/50 line-clamp-2">
                        {truncateDescription(book.description, 80)}...
                      </p>
                    )}
                    <Link
                      to={`/books/${book.id}`}
                      className="mt-1 inline-block text-xs not-italic text-[#B8860B] no-underline hover:underline"
                    >
                      {book.description ? "Seguir" : "Ver más"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0D0D0D] py-10 text-center">
        <p
          className="text-sm font-semibold uppercase tracking-[0.4em] text-[#B8860B]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Athenaeum
        </p>
        <p className="mt-2 text-xs text-white/40">
          © 2026 — El arte de leer
        </p>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        totalCount={cart.totalCount}
        totalEnabled={cart.totalEnabled}
        onToggle={cart.toggleEnabled}
        onRemove={cart.removeItem}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
