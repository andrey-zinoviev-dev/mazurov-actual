"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/Account/ProfileMenu";
import { ProductSearch } from "@/components/ProductSearch/ProductSearch";

/** Слот для мобильной кнопки категорий (portal из CatalogNav) */
export const SHOP_HEADER_SUBNAV_ID = "shop-header-subnav";

export type HeaderCustomer = {
  id: number;
  phone: string;
} | null;

export function Header({ customer = null }: { customer?: HeaderCustomer }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAccount =
    pathname === "/account" || pathname.startsWith("/account/");
  const isLogin = pathname === "/login";

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

        <div className="header-top__main">
          <ProductSearch />

          <nav className="header-actions" aria-label="Аккаунт">
            {/* Десктоп: меню профиля или вход; на мобилке — в tab bar */}
            {customer ? (
              <ProfileMenu isAccountPage={isAccount} />
            ) : (
              <Link
                href="/login"
                className="header-action-btn header-action-btn--cta header-action-btn--desktop-only"
                aria-current={isLogin ? "page" : undefined}
              >
                войти
              </Link>
            )}
          </nav>
        </div>
      </div>

      <div className="header-subnav" id={SHOP_HEADER_SUBNAV_ID} />
    </header>
  );
}
