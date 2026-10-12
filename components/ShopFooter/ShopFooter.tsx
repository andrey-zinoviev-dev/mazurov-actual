import Link from "next/link";
import { SITE } from "@/lib/site";
import "./ShopFooter.css";

const PHONE_HREF = `tel:${SITE.phoneE164}`;

/** Короткий NAP-футер: телефон, адрес, контакты. */
export function ShopFooter() {
  return (
    <footer className="shop-footer">
      <div className="shop-footer__inner">
        <p className="shop-footer__brand">{SITE.name}</p>
        <p className="shop-footer__line">
          <a href={PHONE_HREF}>{SITE.phoneLabel}</a>
          {" · "}
          <span>{SITE.pickupAddress}</span>
        </p>
        <p className="shop-footer__line">
          <Link href="/contacts">Контакты</Link>
          {" · "}
          <Link href="/">Каталог</Link>
        </p>
      </div>
    </footer>
  );
}
