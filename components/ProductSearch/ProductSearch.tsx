"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  addCartItem,
  getServerCartSnapshot,
  readCart,
  subscribeCart,
} from "@/lib/cart";
import { productPath } from "@/lib/catalog-path";
import "./ProductSearch.css";

export type ProductSearchHit = {
  id: number;
  name: string;
  price: number;
  imageSrc: string;
};

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;
const MOBILE_MQ = "(max-width: 899px)";

function formatPricePerDay(price: number): string {
  return `${price.toLocaleString("ru-RU")} ₽/день`;
}

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function getServerMobileSnapshot() {
  return false;
}

export function ProductSearch() {
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const cart = useSyncExternalStore(subscribeCart, readCart, getServerCartSnapshot);
  const cartIds = new Set(cart.map((line) => line.id));

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_QUERY;
  const sheetActive = isMobile && sheetOpen;
  const showList = sheetActive ? canSearch : open && canSearch;
  const showPanel = sheetActive || showList;

  function closeSheet() {
    setSheetOpen(false);
    setOpen(false);
    setActiveIndex(-1);
  }

  function resetSearch() {
    setQuery("");
    setHits([]);
    setOpen(false);
    setSheetOpen(false);
    setActiveIndex(-1);
  }

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isMobile && sheetOpen) {
      setSheetOpen(false);
    }
  }, [isMobile, sheetOpen]);

  useEffect(() => {
    if (!sheetActive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.cancelAnimationFrame(id);
    };
  }, [sheetActive]);

  useEffect(() => {
    if (!canSearch) {
      setHits([]);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error("search failed");
        }
        const data = (await res.json()) as { products?: ProductSearchHit[] };
        const next = Array.isArray(data.products) ? data.products : [];
        setHits(next);
        setActiveIndex(next.length > 0 ? 0 : -1);
        setOpen(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setHits([]);
        setError("ошибка поиска");
        setActiveIndex(-1);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmed]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (sheetActive) return;
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [sheetActive]);

  function addHit(hit: ProductSearchHit) {
    addCartItem({
      id: hit.id,
      name: hit.name,
      price: hit.price,
      imageSrc: hit.imageSrc,
    });
    if (sheetActive) {
      inputRef.current?.focus();
      return;
    }
    resetSearch();
    inputRef.current?.focus();
  }

  function openHit(hit: ProductSearchHit) {
    resetSearch();
    router.push(productPath(hit.id));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (activeIndex >= 0 && hits[activeIndex]) {
      openHit(hits[activeIndex]);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (sheetActive) {
        closeSheet();
        return;
      }
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!showList || hits.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % hits.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? hits.length - 1 : i - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && hits[activeIndex]) {
      event.preventDefault();
      openHit(hits[activeIndex]);
    }
  }

  const statusText = !canSearch
    ? sheetActive
      ? "введите минимум 2 символа"
      : null
    : loading
      ? "ищу…"
      : error
        ? error
        : hits.length === 0
          ? "ничего не найдено"
          : null;

  const searchForm = (
    <form className="product-search__form" onSubmit={onSubmit} role="search">
      <label className="visually-hidden" htmlFor={inputId}>
        Поиск товаров
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="product-search__input"
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="найти…"
        value={query}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-activedescendant={
          showList && activeIndex >= 0 && hits[activeIndex]
            ? `${listboxId}-option-${hits[activeIndex].id}`
            : undefined
        }
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (canSearch) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
    </form>
  );

  const resultsPanel = showPanel ? (
    <div className="product-search__panel">
      {statusText ? (
        <p className="product-search__status" aria-live="polite">
          {statusText}
        </p>
      ) : null}
      {hits.length > 0 && canSearch ? (
        <ul
          id={listboxId}
          className="product-search__list"
          role="listbox"
          aria-label="Результаты поиска"
        >
          {hits.map((hit, index) => {
            const inCart = cartIds.has(hit.id);
            const active = index === activeIndex;
            return (
              <li key={hit.id} role="presentation">
                <div
                  id={`${listboxId}-option-${hit.id}`}
                  role="option"
                  aria-selected={active}
                  className={
                    active
                      ? "product-search__option product-search__option--active"
                      : "product-search__option"
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <Link
                    href={productPath(hit.id)}
                    className="product-search__link"
                    tabIndex={-1}
                    onClick={resetSearch}
                  >
                    <span className="product-search__thumb">
                      <Image
                        src={hit.imageSrc}
                        alt=""
                        width={40}
                        height={30}
                        className="product-search__image"
                      />
                    </span>
                    <span className="product-search__meta">
                      <span className="product-search__name">{hit.name}</span>
                      <span className="product-search__price">
                        {formatPricePerDay(hit.price)}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="product-search__action"
                    tabIndex={-1}
                    onClick={() => addHit(hit)}
                  >
                    {inCart ? "ещё +" : "в корзину"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  ) : null;

  let sheetPortal: ReactNode = null;
  if (portalReady && sheetActive) {
    sheetPortal = createPortal(
      <div
        className="product-search-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск товаров"
      >
        <div className="product-search-sheet__toolbar">
          <button
            type="button"
            className="product-search-sheet__back"
            onClick={closeSheet}
            aria-label="Закрыть поиск"
          >
            <BackIcon />
          </button>
          {searchForm}
        </div>
        {resultsPanel}
      </div>,
      document.body,
    );
  }

  return (
    <div className="product-search" ref={rootRef}>
      <button
        type="button"
        className="product-search__trigger"
        onClick={() => setSheetOpen(true)}
        aria-label="Открыть поиск"
      >
        <span
          className={
            query.trim()
              ? "product-search__trigger-text"
              : "product-search__trigger-text product-search__trigger-text--placeholder"
          }
        >
          {query.trim() || "найти…"}
        </span>
      </button>

      {!sheetActive ? (
        <div className="product-search__shell">
          {searchForm}
          {resultsPanel}
        </div>
      ) : null}

      {sheetPortal}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.5 5.5 9 12l6.5 6.5"
      />
    </svg>
  );
}
