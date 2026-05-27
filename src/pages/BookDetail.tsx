import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, BookOpen, Hash, Languages, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/hooks/useCart";
import LoginModal from "@/components/LoginModal";

type Book = {
  id: string | number;
  title: string;
  author?: string | null;
  price?: number | null;
  image_url?: string | null;
  cover_url?: string | null;
  status?: string | null;
  description?: string | null;
  category_id?: string | number | null;
  year?: number | string | null;
  pages?: number | null;
  isbn?: string | null;
  language?: string | null;
};

type Category = { id: string | number; name: string };

function formatPrice(n?: number | null) {
  const value = Number(n ?? 0);
  const [intPart, decPart] = value.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${withThousands},${decPart}`;
}

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setBook(data as Book);
        if ((data as Book).category_id) {
          const { data: cat } = await supabase
            .from("book_categories")
            .select("*")
            .eq("id", (data as Book).category_id)
            .maybeSingle();
          if (cat) setCategory(cat as Category);
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Cargando...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-white/70">No encontramos ese libro.</p>
        <Link to="/" className="text-sm text-[#B8860B] hover:underline">
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  const image = book.image_url || book.cover_url || "";
  const isPaid = book.status === "paid";
  const isReserved = book.status === "reserved";
  const disabled = isPaid || isReserved;
  const buttonLabel = isPaid
    ? "Ya fue regalado"
    : isReserved
    ? "Reservado"
    : "Añadir al Carrito";

  const description = (book.description || "").trim();
  const firstChar = description.charAt(0);
  const restDesc = description.slice(1);

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#B8860B] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[40%_1fr] md:gap-12">
          {/* LEFT — cover */}
          <div className="w-full">
            <div className="overflow-hidden rounded-2xl bg-black/40 shadow-2xl shadow-black/60 ring-1 ring-white/5">
              {image ? (
                <img
                  src={image}
                  alt={book.title}
                  className="h-auto w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-xs text-white/30">
                  Sin imagen
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — info */}
          <div className="flex flex-col">
            {category && (
              <span className="inline-flex w-fit items-center rounded-full border border-[#B8860B] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B8860B]">
                {category.name}
              </span>
            )}

            <h1
              className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {book.title}
            </h1>

            {book.author && (
              <p className="mt-3 text-base italic text-white/60">
                por {book.author}
              </p>
            )}

            <p className="mt-5 text-3xl font-bold text-[#B8860B] sm:text-4xl">
              {formatPrice(book.price)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
              {book.year && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {book.year}
                </span>
              )}
              {book.pages && (
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {book.pages} pág.
                </span>
              )}
              {book.isbn && (
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {book.isbn}
                </span>
              )}
              {book.language && (
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" />
                  {book.language}
                </span>
              )}
            </div>

            {description && (
              <p className="mt-8 text-[15px] leading-relaxed text-white/90">
                <span
                  className="float-left mr-2 mt-1 text-6xl font-bold leading-none text-[#B8860B]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {firstChar}
                </span>
                {restDesc}
              </p>
            )}

            <button
              disabled={disabled}
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
                  toast.success("Añadido al carrito");
                }
              }}
              className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-semibold uppercase tracking-wider transition-colors ${
                disabled
                  ? "cursor-not-allowed bg-white/10 text-white/50"
                  : "bg-[#8B0000] text-white hover:bg-[#a00000]"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
