import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export default function Success() {
  const navigate = useNavigate();

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
          <span style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.35))" }}>✨</span>
          <span className="mx-1">🌟</span>
          <span>💖</span>
        </div>

        <h1
          className="text-3xl md:text-4xl font-semibold mb-3"
          style={{ color: "#B8860B" }}
        >
          ¡Hiciste feliz a Umma!
        </h1>
        <p className="text-white text-base md:text-lg">
          Tu compra se confirmó exitosamente
        </p>

        <Link
          to="/"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        >
          Volver
        </Link>
      </div>
    </div>
  );
}
