"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

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

        <nav className="header-actions" aria-label="Действия">
          <Link href="/cart" className="header-action-btn">
            [ корзина ]
          </Link>
        </nav>
      </div>
    </header>
  );
}
