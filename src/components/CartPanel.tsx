import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { CartItem } from "@/hooks/useCart";

const SIDE_IMAGE =
  "https://lyesyoofgicfezabtnns.supabase.co/storage/v1/object/public/assets/ui/carrito-lateral.jpeg";

function formatPrice(n?: number | null) {
  const value = Number(n ?? 0);
  const [intPart, decPart] = value.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${withThousands},${decPart}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  totalCount: number;
  totalEnabled: number;
  onToggle: (id: string | number, value: boolean) => void;
  onRemove: (id: string | number) => void;
  onConfirm: (message: string | null) => void;
};

export default function CartPanel({
  open,
  onClose,
  items,
  totalCount,
  totalEnabled,
  onToggle,
  onRemove,
  onConfirm,
}: Props) {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showMessageModal) {
        setShowMessageModal(false);
        return;
      }
      onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, showMessageModal]);

  const runConfirm = async (message: string | null) => {
    setLoading(true);
    const result = await Promise.resolve(
      onConfirm(message) as boolean | Promise<boolean> | void,
    );
    if (result === false) setLoading(false);
  };

  const handleDeclineMessage = () => {
    setShowMessageModal(false);
    setMessageText("");
    void runConfirm(null);
  };

  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setShowMessageModal(false);
    setMessageText("");
    void runConfirm(trimmed);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-end bg-black/70"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full md:w-3/4 bg-[#1A1A2E] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT — image */}
        <div className="hidden md:block md:w-1/2 h-full">
          <img
            src={SIDE_IMAGE}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* RIGHT — content */}
        <div className="relative flex w-full md:w-1/2 h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/10">
            <div>
              <h2
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Tu Carrito
              </h2>
              <p className="mt-1 text-xs text-white/50">
                {totalCount} tomo(s) seleccionado(s)
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <p className="py-16 text-center text-sm text-white/50">
                Tu carrito está vacío
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition-opacity ${
                      item.enabled ? "" : "opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => onToggle(item.id, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-[#B8860B] cursor-pointer"
                    />
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || ""}
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-md bg-black/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-bold text-[#B8860B]"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {item.title || "Sin título"}
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold text-[#B8860B] ${
                          item.enabled ? "" : "line-through"
                        }`}
                      >
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label="Eliminar"
                      className="shrink-0 rounded-md p-2 text-white/60 hover:text-[#8B0000] hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/50">Total</span>
              <span className="text-xl font-bold text-[#B8860B]">
                {formatPrice(totalEnabled)}
              </span>
            </div>
            <button
              type="button"
              className="w-full rounded-lg bg-[#8B0000] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-[#a00000] transition-colors disabled:opacity-50"
              disabled={items.length === 0}
              onClick={() => setShowMessageModal(true)}
            >
              Confirmar Pedido
            </button>
          </div>

          {showMessageModal && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gift-message-title"
            >
              <div className="w-full max-w-sm rounded-xl border border-[#B8860B]/30 bg-[#1A1A2E] p-6 mx-auto">
                <h3
                  id="gift-message-title"
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  ¿Querés dejarle un mensaje a Umma con tu regalo?
                </h3>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribí tu mensaje aquí..."
                  className="mt-4 w-full resize-none rounded-lg border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus:border-[#B8860B] focus:outline-none"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleDeclineMessage}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-white bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    No, gracias
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={loading || !messageText.trim()}
                    className="flex-1 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#a00000] disabled:opacity-50"
                  >
                    {loading ? "Procesando..." : "Enviar mensaje"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
