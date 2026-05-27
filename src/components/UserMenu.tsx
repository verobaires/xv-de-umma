import { useEffect, useRef, useState } from "react";
import { User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  onRequireAuth?: () => void;
};

export default function UserMenu({ userId, name, avatarUrl, onRequireAuth }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (name || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleClick = () => {
    if (!userId) {
      onRequireAuth?.();
      return;
    }
    setOpen((v) => !v);
  };

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut failed", err);
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={handleClick}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:text-[#B8860B] hover:border-[#B8860B] transition-colors overflow-hidden"
        aria-label={userId ? "Cuenta" : "Iniciar sesión"}
      >
        {userId && avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : userId && initials ? (
          <span className="text-xs font-semibold">{initials}</span>
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>
      {open && userId && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border border-white/10 bg-[#22223a] shadow-xl py-1 z-50">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
