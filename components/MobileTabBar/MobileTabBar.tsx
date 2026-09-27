"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./MobileTabBar.css";

export type MobileTabBarCustomer = {
  id: number;
  phone: string;
} | null;

export function MobileTabBar({
  customer = null,
}: {
  customer?: MobileTabBarCustomer;
}) {
  const pathname = usePathname();

  const isFavorites = pathname === "/favorites";
  const isCart = pathname === "/cart" || pathname.startsWith("/cart/");
  const isAccount =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/login";
  const isCatalog =
    !isFavorites &&
    !isCart &&
    !isAccount &&
    (pathname === "/" || pathname.startsWith("/category/"));

  const profileHref = customer ? "/account" : "/login";
  const profileLabel = customer ? "профиль" : "войти";

  return (
    <nav className="mobile-tab-bar" aria-label="Основная навигация">
      <Link
        href="/"
        className={
          isCatalog
            ? "mobile-tab-bar__item mobile-tab-bar__item--active"
            : "mobile-tab-bar__item"
        }
        aria-current={isCatalog ? "page" : undefined}
      >
        <CatalogIcon />
        <span>каталог</span>
      </Link>

      <Link
        href="/favorites"
        className={
          isFavorites
            ? "mobile-tab-bar__item mobile-tab-bar__item--active"
            : "mobile-tab-bar__item"
        }
        aria-current={isFavorites ? "page" : undefined}
      >
        <HeartIcon />
        <span>избранное</span>
      </Link>

      <Link
        href="/cart"
        className={
          isCart
            ? "mobile-tab-bar__item mobile-tab-bar__item--active"
            : "mobile-tab-bar__item"
        }
        aria-current={isCart ? "page" : undefined}
      >
        <CartIcon />
        <span>корзина</span>
      </Link>

      <Link
        href={profileHref}
        className={
          isAccount
            ? "mobile-tab-bar__item mobile-tab-bar__item--active"
            : "mobile-tab-bar__item"
        }
        aria-current={isAccount ? "page" : undefined}
      >
        <ProfileIcon />
        <span>{profileLabel}</span>
      </Link>
    </nav>
  );
}

function CatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="M4.5 4.5h6v6h-6v-6Zm9 0h6v6h-6v-6Zm-9 9h6v6h-6v-6Zm9 0h6v6h-6v-6Z"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25s-7.2-4.35-7.2-9.15A3.9 3.9 0 0 1 12 7.65a3.9 3.9 0 0 1 7.2 3.45c0 4.8-7.2 9.15-7.2 9.15Z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 5.5h1.6l1.4 10.2h11.4l1.5-7.2H7.1M9 20.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm8.2 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5.5 19.2a6.5 6.5 0 0 1 13 0"
      />
    </svg>
  );
}
