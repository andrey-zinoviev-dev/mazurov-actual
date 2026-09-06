"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./MobileTabBar.css";

export function MobileTabBar() {
  const pathname = usePathname();

  const isFavorites = pathname === "/favorites";
  const isCart = pathname === "/cart" || pathname.startsWith("/cart/");
  const isContacts = pathname === "/contacts";
  const isCatalog =
    !isFavorites &&
    !isCart &&
    !isContacts &&
    (pathname === "/" || pathname.startsWith("/category/"));

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
        href="/contacts"
        className={
          isContacts
            ? "mobile-tab-bar__item mobile-tab-bar__item--active"
            : "mobile-tab-bar__item"
        }
        aria-current={isContacts ? "page" : undefined}
      >
        <ContactsIcon />
        <span>контакты</span>
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

function ContactsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M9 9h6M9 12.5h6M9 16h3.5"
      />
    </svg>
  );
}
