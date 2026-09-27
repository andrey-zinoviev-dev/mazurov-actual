"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useFavorites } from "@/components/FavoritesProvider";
import {
  SHOP_HEADER_SUBNAV_ID,
} from "@/components/Header";
import {
  countCartItems,
  getServerCartSnapshot,
  readCart,
  subscribeCart,
} from "@/lib/cart";
import "./CatalogNav.css";

export type CatalogNavItem = {
  slug: string;
  name: string;
  href: string;
};

export type CatalogNavRootItem = {
  slug: string;
  name: string;
  shelves: CatalogNavItem[];
};

type CatalogNavProps = {
  /** Заголовок drawer на мобиле */
  title: string;
  /** Ссылка «все» — полный каталог на главной */
  allHref?: string;
  roots: CatalogNavRootItem[];
};

function isCatalogBrowsePath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/category/");
}

function findActiveRootSlug(
  roots: CatalogNavRootItem[],
  pathname: string,
): string | null {
  for (const root of roots) {
    if (root.shelves.some((shelf) => pathname === shelf.href)) {
      return root.slug;
    }
  }
  return null;
}

function findActiveShelf(
  roots: CatalogNavRootItem[],
  pathname: string,
): CatalogNavItem | undefined {
  for (const root of roots) {
    const shelf = root.shelves.find((item) => pathname === item.href);
    if (shelf) return shelf;
  }
  return undefined;
}

function linkClass(active: boolean): string {
  return active
    ? "catalog-nav__link catalog-nav__link--active"
    : "catalog-nav__link";
}

function toggleClass(open: boolean, active = false): string {
  const parts = ["catalog-nav__root-toggle"];
  if (open) parts.push("catalog-nav__root-toggle--open");
  if (active) parts.push("catalog-nav__root-toggle--active");
  return parts.join(" ");
}

function subscribeNoop() {
  return () => {};
}

function getSubnavSlotSnapshot(): HTMLElement | null {
  return document.getElementById(SHOP_HEADER_SUBNAV_ID);
}

function getSubnavSlotServerSnapshot(): HTMLElement | null {
  return null;
}

/** Дерево категорий: «все» + разделы. Для drawer и внутри аккордеона «каталог». */
function CatalogTree({
  allHref,
  roots,
  pathname,
  idPrefix,
  className = "catalog-nav__tree",
  id,
}: {
  allHref: string;
  roots: CatalogNavRootItem[];
  pathname: string;
  idPrefix: string;
  className?: string;
  id?: string;
}) {
  const allActive = pathname === "/" || pathname === allHref;
  const [openRootSlug, setOpenRootSlug] = useState<string | null>(() =>
    isCatalogBrowsePath(pathname)
      ? findActiveRootSlug(roots, pathname)
      : null,
  );
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpenRootSlug(
      isCatalogBrowsePath(pathname)
        ? findActiveRootSlug(roots, pathname)
        : null,
    );
  }

  function toggleRoot(slug: string) {
    setOpenRootSlug((current) => (current === slug ? null : slug));
  }

  return (
    <ul id={id} className={className}>
      <li>
        <Link href={allHref} className={linkClass(allActive)}>
          все
        </Link>
      </li>
      {roots.map((root) => {
        const isOpen = openRootSlug === root.slug;
        const panelId = `${idPrefix}-${root.slug}`;

        return (
          <li key={root.slug} className="catalog-nav__root">
            <button
              type="button"
              className={toggleClass(isOpen)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleRoot(root.slug)}
            >
              <span>{root.name}</span>
              <span className="catalog-nav__root-chevron" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <ul id={panelId} className="catalog-nav__shelves">
                {root.shelves.map((shelf) => {
                  const active = pathname === shelf.href;
                  return (
                    <li key={`${shelf.href}:${shelf.slug}`}>
                      <Link
                        href={shelf.href}
                        className={linkClass(active)}
                      >
                        {shelf.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Десктоп-сайдбар: каталог (аккордеон) + служебные ссылки. */
function SidebarNav({
  allHref,
  roots,
  pathname,
}: {
  allHref: string;
  roots: CatalogNavRootItem[];
  pathname: string;
}) {
  const browseCatalog = isCatalogBrowsePath(pathname);
  const [catalogOpen, setCatalogOpen] = useState(browseCatalog);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const panelId = useId();

  const { items: favorites } = useFavorites();
  const favoritesCount = favorites.length;
  const cart = useSyncExternalStore(
    subscribeCart,
    readCart,
    getServerCartSnapshot,
  );
  const cartCount = useMemo(() => countCartItems(cart), [cart]);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setCatalogOpen(isCatalogBrowsePath(pathname));
  }

  const isFavorites = pathname === "/favorites";
  const isCart = pathname === "/cart" || pathname.startsWith("/cart/");
  const isContacts = pathname === "/contacts";

  return (
    <ul className="catalog-nav__tree">
      <li className="catalog-nav__root">
        <button
          type="button"
          className={toggleClass(catalogOpen, browseCatalog)}
          aria-expanded={catalogOpen}
          aria-controls={catalogOpen ? panelId : undefined}
          onClick={() => setCatalogOpen((open) => !open)}
        >
          <span>каталог</span>
          <span className="catalog-nav__root-chevron" aria-hidden="true">
            {catalogOpen ? "−" : "+"}
          </span>
        </button>
        {catalogOpen ? (
          <CatalogTree
            id={panelId}
            allHref={allHref}
            roots={roots}
            pathname={pathname}
            idPrefix="catalog-nav-sidebar"
            className="catalog-nav__tree catalog-nav__tree--nested"
          />
        ) : null}
      </li>

      <li>
        <Link
          href="/favorites"
          className={linkClass(isFavorites)}
          aria-current={isFavorites ? "page" : undefined}
          aria-label={
            favoritesCount > 0
              ? `Избранное, ${favoritesCount}`
              : "Избранное"
          }
        >
          избранное{favoritesCount > 0 ? ` ${favoritesCount}` : ""}
        </Link>
      </li>
      <li>
        <Link
          href="/cart"
          className={linkClass(isCart)}
          aria-current={isCart ? "page" : undefined}
          aria-label={cartCount > 0 ? `Корзина, ${cartCount}` : "Корзина"}
        >
          корзина{cartCount > 0 ? ` ${cartCount}` : ""}
        </Link>
      </li>
      <li>
        <Link
          href="/contacts"
          className={linkClass(isContacts)}
          aria-current={isContacts ? "page" : undefined}
        >
          контакты
        </Link>
      </li>
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
  roots,
}: CatalogNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const subnavSlot = useSyncExternalStore(
    subscribeNoop,
    getSubnavSlotSnapshot,
    getSubnavSlotServerSnapshot,
  );

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const activeShelf = findActiveShelf(roots, pathname);
  const triggerLabel = activeShelf?.name ?? "категории";

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

  useEffect(() => {
    scrollActiveLinkIntoView(
      navRef.current,
      ".catalog-nav__sidebar .catalog-nav__link--active, .catalog-nav__sidebar .catalog-nav__root-toggle--active",
    );
  }, [pathname]);

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

      <nav className="catalog-nav__sidebar" aria-label="Навигация">
        <SidebarNav
          allHref={allHref}
          roots={roots}
          pathname={pathname}
        />
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
              roots={roots}
              pathname={pathname}
              idPrefix="catalog-nav-drawer"
            />
          </nav>
        </div>
      </dialog>
    </div>
  );
}
