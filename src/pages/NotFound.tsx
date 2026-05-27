import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-[#B8860B]" style={{ fontFamily: "var(--font-serif)" }}>
        404
      </h1>
      <p className="mt-4 text-[#AAAAAA]">Página no encontrada</p>
      <Link to="/" className="mt-6 text-sm text-[#B8860B] underline">
        Volver al inicio
      </Link>
    </main>
  );
}
