"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { SHOP_HEADER_SUBNAV_ID } from "@/components/Header";
import "./CatalogNav.css";

export type CatalogNavItem = {
  slug: string;
  name: string;
  href: string;
};

type CatalogNavProps = {
  /** Заголовок drawer на мобиле */
  title: string;
  /** Ссылка «все» — полный каталог на главной */
  allHref?: string;
  shelves: CatalogNavItem[];
};

function CatalogTree({
  allHref,
  shelves,
  pathname,
}: {
  allHref: string;
  shelves: CatalogNavItem[];
  pathname: string;
}) {
  const allActive = pathname === "/" || pathname === allHref;

  return (
    <ul className="catalog-nav__tree">
      <li>
        <Link
          href={allHref}
          className={
            allActive
              ? "catalog-nav__link catalog-nav__link--active"
              : "catalog-nav__link"
          }
        >
          все
        </Link>
      </li>
      {shelves.map((shelf) => {
        const active = pathname === shelf.href;
        return (
          <li key={`${shelf.href}:${shelf.slug}`}>
            <Link
              href={shelf.href}
              className={
                active
                  ? "catalog-nav__link catalog-nav__link--active"
                  : "catalog-nav__link"
              }
            >
              {shelf.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function scrollActiveLinkIntoView(root: ParentNode | null, selector: string) {
  const active = root?.querySelector<HTMLElement>(selector);
  active?.scrollIntoView({ block: "center", inline: "center" });
}

export function CatalogNav({
  title,
  allHref = "/",
  shelves,
}: CatalogNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [subnavSlot, setSubnavSlot] = useState<HTMLElement | null>(null);

  const activeShelf = shelves.find((shelf) => pathname === shelf.href);
  const triggerLabel = activeShelf?.name ?? "категории";

  useEffect(() => {
    setSubnavSlot(document.getElementById(SHOP_HEADER_SUBNAV_ID));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Закрываем drawer после смены URL, а не в onClick Link —
  // иначе dialog.close() в production может оборвать soft-navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Десктоп: sticky-сайдбар скроллится к активной полке.
  useEffect(() => {
    scrollActiveLinkIntoView(
      navRef.current,
      ".catalog-nav__sidebar .catalog-nav__link--active",
    );
  }, [pathname]);

  // Мобильный drawer: при открытии показать активный пункт.
  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      scrollActiveLinkIntoView(
        dialogRef.current,
        ".catalog-nav__drawer-body .catalog-nav__link--active",
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [open, pathname]);

  function close() {
    setOpen(false);
  }

  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  const trigger = (
    <button
      type="button"
      className="catalog-nav__trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      [ {triggerLabel} <span aria-hidden="true">▼</span> ]
    </button>
  );

  return (
    <div className="catalog-nav" ref={navRef}>
      {subnavSlot ? createPortal(trigger, subnavSlot) : trigger}

      <nav className="catalog-nav__sidebar" aria-label="Подкатегории">
        <CatalogTree allHref={allHref} shelves={shelves} pathname={pathname} />
      </nav>

      <dialog
        ref={dialogRef}
        className="catalog-nav__dialog"
        aria-labelledby={titleId}
        onClose={close}
        onClick={onDialogClick}
      >
        <div className="catalog-nav__panel">
          <header className="catalog-nav__drawer-header">
            <h2 id={titleId} className="catalog-nav__drawer-title">
              {title}
            </h2>
            <button
              type="button"
              className="catalog-nav__close"
              onClick={close}
            >
              [ закрыть ]
            </button>
          </header>

          <nav className="catalog-nav__drawer-body" aria-label="Подкатегории">
            <CatalogTree
              allHref={allHref}
              shelves={shelves}
              pathname={pathname}
            />
          </nav>
        </div>
      </dialog>
    </div>
  );
}
