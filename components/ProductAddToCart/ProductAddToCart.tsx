"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  addCartItem,
  getServerCartSnapshot,
  readCart,
  subscribeCart,
  updateCartQuantity,
  type CartItemInput,
} from "@/lib/cart";
import "./ProductAddToCart.css";

type ProductAddToCartProps = CartItemInput & {
  className?: string;
  /**
   * `compact` — в карточке каталога:
   * мобилка: иконка + бейдж + bottom sheet;
   * десктоп: иконка → сразу степпер ±.
   */
  variant?: "default" | "compact";
};

const MOBILE_MQ = "(max-width: 899px)";
const SHEET_CLOSE_MS = 220;

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

export function ProductAddToCart({
  id,
  name,
  price,
  imageSrc,
  className,
  variant = "default",
}: ProductAddToCartProps) {
  const titleId = useId();
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );
  const cart = useSyncExternalStore(
    subscribeCart,
    readCart,
    getServerCartSnapshot,
  );
  const quantity = useMemo(
    () => cart.find((line) => line.id === id)?.quantity ?? 0,
    [cart, id],
  );

  const isCompact = variant === "compact";
  const useSheet = isCompact && isMobile;
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [draftQty, setDraftQty] = useState(1);
  const [portalReady, setPortalReady] = useState(false);

  const sheetOpen = sheetMounted && !sheetClosing;

  const rootClass = [
    "product-add-to-cart",
    isCompact ? "product-add-to-cart--compact" : null,
    quantity >= 1 ? "product-add-to-cart--in-cart" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!useSheet && sheetMounted) {
      setSheetMounted(false);
      setSheetClosing(false);
    }
  }, [useSheet, sheetMounted]);

  useEffect(() => {
    if (!sheetMounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheetClosing(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetMounted]);

  function handleAdd() {
    addCartItem({ id, name, price, imageSrc });
  }

  function handleDecrement() {
    if (quantity < 1) return;
    updateCartQuantity(id, quantity - 1);
  }

  function openSheet() {
    setDraftQty(quantity > 0 ? quantity : 1);
    setSheetClosing(false);
    setSheetMounted(true);
  }

  function requestCloseSheet() {
    setSheetClosing(true);
  }

  function finishCloseSheet() {
    setSheetMounted(false);
    setSheetClosing(false);
  }

  function commitSheet() {
    if (draftQty < 1) {
      updateCartQuantity(id, 0);
      requestCloseSheet();
      return;
    }

    if (quantity < 1) {
      addCartItem({ id, name, price, imageSrc });
      if (draftQty > 1) {
        updateCartQuantity(id, draftQty);
      }
    } else {
      updateCartQuantity(id, draftQty);
    }
    requestCloseSheet();
  }

  useEffect(() => {
    if (!sheetClosing) return;
    const timer = window.setTimeout(finishCloseSheet, SHEET_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [sheetClosing]);

  const sheet =
    portalReady && useSheet && sheetMounted
      ? createPortal(
          <div
            className={
              sheetClosing
                ? "product-add-sheet product-add-sheet--closing"
                : "product-add-sheet"
            }
          >
            <button
              type="button"
              className="product-add-sheet__backdrop"
              aria-label="Закрыть"
              disabled={sheetClosing}
              onClick={requestCloseSheet}
            />
            <div
              className="product-add-sheet__panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onAnimationEnd={(event) => {
                if (
                  sheetClosing &&
                  event.target === event.currentTarget &&
                  event.animationName === "product-add-sheet-down"
                ) {
                  finishCloseSheet();
                }
              }}
            >
              <div className="product-add-sheet__handle" aria-hidden="true" />
              <h2 id={titleId} className="product-add-sheet__title">
                {name}
              </h2>
              <p className="product-add-sheet__price">
                {price.toLocaleString("ru-RU")} ₽/день
              </p>

              <div
                className="product-add-to-cart product-add-sheet__stepper"
                aria-label="Количество"
              >
                <button
                  type="button"
                  className="product-add-to-cart__btn"
                  aria-label="Уменьшить количество"
                  disabled={draftQty < 1 || sheetClosing}
                  onClick={() => setDraftQty((q) => Math.max(0, q - 1))}
                >
                  −
                </button>
                <span className="product-add-to-cart__count" aria-live="polite">
                  {draftQty}
                </span>
                <button
                  type="button"
                  className="product-add-to-cart__btn"
                  aria-label="Увеличить количество"
                  disabled={sheetClosing}
                  onClick={() => setDraftQty((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <div className="product-add-sheet__actions">
                <button
                  type="button"
                  className="product-add-to-cart__cta product-add-sheet__confirm"
                  disabled={sheetClosing}
                  onClick={commitSheet}
                >
                  {draftQty < 1 ? "убрать из корзины" : "подтвердить"}
                </button>
                <button
                  type="button"
                  className="product-add-sheet__close"
                  disabled={sheetClosing}
                  onClick={requestCloseSheet}
                >
                  закрыть
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const stepper = (
    <div className={rootClass} aria-label="Количество в корзине">
      <button
        type="button"
        className="product-add-to-cart__btn"
        aria-label="Уменьшить количество"
        onClick={handleDecrement}
      >
        −
      </button>
      <span className="product-add-to-cart__count" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="product-add-to-cart__btn"
        aria-label="Увеличить количество"
        onClick={handleAdd}
      >
        +
      </button>
    </div>
  );

  if (isCompact && useSheet) {
    const label =
      quantity > 0
        ? `В корзине ${quantity}, изменить количество`
        : "Добавить в корзину";

    return (
      <div className={rootClass}>
        <button
          type="button"
          className="product-add-to-cart__cta product-add-to-cart__cta--icon"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={openSheet}
        >
          <CartIcon />
          {quantity > 0 ? (
            <span className="product-add-to-cart__badge">{quantity}</span>
          ) : null}
        </button>
        {sheet}
      </div>
    );
  }

  if (isCompact) {
    if (quantity < 1) {
      return (
        <div className={rootClass}>
          <button
            type="button"
            className="product-add-to-cart__cta product-add-to-cart__cta--icon"
            aria-label="Добавить в корзину"
            onClick={handleAdd}
          >
            <CartIcon />
          </button>
        </div>
      );
    }
    return stepper;
  }

  if (quantity < 1) {
    return (
      <div className={rootClass}>
        <button
          type="button"
          className="product-add-to-cart__cta"
          onClick={handleAdd}
        >
          <CartIcon />
          <span>добавить в корзину</span>
        </button>
      </div>
    );
  }

  return stepper;
}

function CartIcon() {
  return (
    <svg
      className="product-add-to-cart__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 5.5h1.6l1.4 10.2h11.4l1.5-7.2H7.1M9 20.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm8.2 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}
