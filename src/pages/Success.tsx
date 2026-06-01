import { useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";

type PaymentStatus = "success" | "failure" | "pending";

function resolveStatus(raw: string | null): PaymentStatus {
  if (raw === "failure") return "failure";
  if (raw === "pending") return "pending";
  return "success";
}

const STATUS_CONTENT: Record<
  PaymentStatus,
  {
    emoji: string;
    title: string;
    titleGold: boolean;
    subtitle: string;
  }
> = {
  success: {
    emoji: "✨🌟💖",
    title: "¡Hiciste feliz a Umma!",
    titleGold: true,
    subtitle: "Tu regalo está en camino",
  },
  failure: {
    emoji: "😔",
    title: "Algo salió mal con el pago",
    titleGold: false,
    subtitle: "Podés intentarlo de nuevo desde el catálogo",
  },
  pending: {
    emoji: "⏳",
    title: "Tu pago está siendo procesado",
    titleGold: true,
    subtitle: "Te avisaremos cuando se confirme",
  },
};

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = resolveStatus(searchParams.get("status"));
  const content = STATUS_CONTENT[status];

  return (
    <div className="min-h-screen w-full bg-[#0D0D0D] text-white flex items-center justify-center px-6 relative">
      <button
        onClick={() => navigate("/")}
        aria-label="Cerrar"
        className="absolute top-5 right-5 text-white/80 hover:text-white transition-colors cursor-pointer"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center text-center max-w-md">
        <div className="text-6xl md:text-7xl mb-6 select-none" aria-hidden="true">
          {status === "success" ? (
            <>
              <span style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.35))" }}>✨</span>
              <span className="mx-1">🌟</span>
              <span>💖</span>
            </>
          ) : (
            content.emoji
          )}
        </div>

        <h1
          className="text-3xl md:text-4xl font-semibold mb-3"
          style={content.titleGold ? { color: "#B8860B" } : undefined}
        >
          {content.title}
        </h1>
        <p
          className={
            status === "success"
              ? "text-white text-base md:text-lg mb-8"
              : "text-white/70 text-base md:text-lg mb-8"
          }
        >
          {content.subtitle}
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-lg border border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B]/10 transition-colors cursor-pointer"
        >
          Volver al catálogo
        </button>
      </div>
    </div>
  );
}
