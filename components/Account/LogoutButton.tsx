"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./LogoutButton.css";

type LogoutButtonProps = {
  className?: string;
  /** `danger` — красная кнопка как destructive action; `menu` — пункт меню в стиле dropdown */
  variant?: "text" | "danger";
  onLoggedOut?: () => void;
};

export function LogoutButton({
  className,
  variant = "text",
  onLoggedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onLoggedOut?.();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const classes = [
    variant === "danger" ? "logout-btn logout-btn--danger" : "cart-page__text-btn",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={loading}
      onClick={() => void handleLogout()}
    >
      {variant === "danger" ? (
        <>
          {/* <LogoutIcon /> */}
          <span>{loading ? "выход…" : "выйти"}</span>
        </>
      ) : loading ? (
        "выход…"
      ) : (
        "выйти"
      )}
    </button>
  );
}

// function LogoutIcon() {
//   return (
//     <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
//       <path
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="1.75"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         d="M10 4.5H7.5A2 2 0 0 0 5.5 6.5v11a2 2 0 0 0 2 2H10M13.5 12H20M17 8.5 20.5 12 17 15.5"
//       />
//     </svg>
//   );
// }
