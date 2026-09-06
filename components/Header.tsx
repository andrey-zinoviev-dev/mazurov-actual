"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/FavoritesProvider";
import {
  countCartItems,
  getServerCartSnapshot,
  readCart,
  subscribeCart,
} from "@/lib/cart";

/** Слот для мобильной кнопки категорий (portal из CatalogNav) */
export const SHOP_HEADER_SUBNAV_ID = "shop-header-subnav";

export function Header() {
  const pathname = usePathname();
  const { items: favorites } = useFavorites();
  const favoritesCount = favorites.length;
  const cart = useSyncExternalStore(subscribeCart, readCart, getServerCartSnapshot);
  const cartCount = useMemo(() => countCartItems(cart), [cart]);
  const isHome = pathname === "/";
  const isFavorites = pathname === "/favorites";
  const isCart = pathname === "/cart" || pathname.startsWith("/cart/");
  const isContacts = pathname === "/contacts";

  return (
    <header className="header">
      <div className="header-top">
        <div className="logo-title">
          {isHome ? (
            <Image
              src="/logo.png"
              alt="Mazurov Rental"
              className="logo"
              width={44}
              height={44}
              priority
            />
          ) : (
            <Link href="/" aria-label="На главную">
              <Image
                src="/logo.png"
                alt="Mazurov Rental"
                className="logo logo--link"
                width={44}
                height={44}
                priority
              />
            </Link>
          )}
        </div>

        <nav className="header-actions header-actions--desktop" aria-label="Действия">
          <Link
            href="/favorites"
            className="header-action-btn"
            aria-current={isFavorites ? "page" : undefined}
            aria-label={
              favoritesCount > 0
                ? `Избранное, ${favoritesCount}`
                : "Избранное"
            }
          >
            [ избранное{favoritesCount > 0 ? ` ${favoritesCount}` : ""} ]
          </Link>
          <Link
            href="/cart"
            className="header-action-btn"
            aria-current={isCart ? "page" : undefined}
            aria-label={
              cartCount > 0 ? `Корзина, ${cartCount}` : "Корзина"
            }
          >
            [ корзина{cartCount > 0 ? ` ${cartCount}` : ""} ]
          </Link>
          <Link
            href="/contacts"
            className="header-action-btn"
            aria-current={isContacts ? "page" : undefined}
          >
            [ контакты ]
          </Link>
        </nav>
      </div>

      <div className="header-subnav" id={SHOP_HEADER_SUBNAV_ID} />
    </header>
  );
}
