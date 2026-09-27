"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Секунды до разблокировки; при смене значения таймер перезапускается. */
  seconds: number;
  /** Ключ сброса (например timestamp успешной отправки). */
  resetKey: number;
  disabled?: boolean;
  onResend: () => void;
};

export function OtpResendTimer({
  seconds,
  resetKey,
  disabled = false,
  onResend,
}: Props) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;

    const id = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [seconds, resetKey]);

  const blocked = disabled || left > 0;

  return (
    <div className="otp-resend">
      <button
        type="button"
        className="cart-page__text-btn account-form__secondary"
        disabled={blocked}
        onClick={onResend}
      >
        выслать код ещё раз
      </button>
      {left > 0 ? (
        <p className="account-form__meta otp-resend__timer">
          повтор через {left} с
        </p>
      ) : null}
    </div>
  );
}
