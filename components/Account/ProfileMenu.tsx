"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/components/Account/LogoutButton";
import "./ProfileMenu.css";

type ProfileMenuProps = {
  isAccountPage: boolean;
};

export function ProfileMenu({ isAccountPage }: ProfileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="header-action-btn header-action-btn--cta profile-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        профиль
      </button>

      {open ? (
        <div
          id={menuId}
          className="profile-menu__panel"
          role="menu"
          aria-label="Профиль"
        >
          <Link
            href="/account"
            role="menuitem"
            className={
              isAccountPage
                ? "profile-menu__item profile-menu__item--active"
                : "profile-menu__item"
            }
            aria-current={isAccountPage ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <OrdersIcon />
            <span>заказы</span>
          </Link>

          <div className="profile-menu__divider" role="separator" />

          <div className="profile-menu__logout" role="none">
            <LogoutButton
              variant="danger"
              className="profile-menu__logout-btn"
              onLoggedOut={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v13.2L12 16.4l-6.5 2.8V6A1.5 1.5 0 0 1 7 4.5Z"
      />
    </svg>
  );
}
