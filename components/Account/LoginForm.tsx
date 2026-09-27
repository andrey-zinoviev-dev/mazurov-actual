"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { OtpResendTimer } from "@/components/Account/OtpResendTimer";

type Step = "phone" | "code";

export function LoginForm({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [retryAfterSec, setRetryAfterSec] = useState(60);
  const [resendKey, setResendKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        retryAfterSec?: number;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Не удалось отправить код");
      }

      setRetryAfterSec(data.retryAfterSec ?? 60);
      setResendKey((key) => key + 1);
      setStep("code");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ошибка отправки кода");
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Не удалось войти");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    }
  }

  if (step === "code") {
    return (
      <form className="account-form" onSubmit={verifyCode}>
        <p className="account-form__hint">
          код отправлен в telegram на номер {phone.trim() || "…"}.
        </p>

        <label className="cart-field">
          <span className="cart-field__label">код из telegram</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            required
          />
        </label>

        <button
          type="submit"
          className="cart-page__primary-btn"
          disabled={status === "loading"}
        >
          {status === "loading" ? "проверка…" : "войти"}
        </button>

        <OtpResendTimer
          seconds={retryAfterSec}
          resetKey={resendKey}
          disabled={status === "loading"}
          onResend={() => void requestCode()}
        />

        <button
          type="button"
          className="cart-page__text-btn account-form__secondary"
          disabled={status === "loading"}
          onClick={() => {
            setStep("phone");
            setCode("");
            setMessage("");
          }}
        >
          изменить номер
        </button>

        {message ? (
          <p className="cart-page__status cart-page__status--error">{message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <form className="account-form" onSubmit={requestCode}>
      <p className="account-form__hint">
        вход по номеру телефона — пришлём код в telegram. отдельная регистрация
        не нужна.
      </p>

      <label className="cart-field">
        <span className="cart-field__label">телефон</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 (999) 123-45-67"
          autoComplete="tel"
          required
        />
      </label>

      <button
        type="submit"
        className="cart-page__primary-btn"
        disabled={status === "loading"}
      >
        {status === "loading" ? "отправка…" : "получить код"}
      </button>

      {message ? (
        <p className="cart-page__status cart-page__status--error">{message}</p>
      ) : null}

      <p className="account-form__meta">
        <Link href="/cart">вернуться в корзину</Link>
      </p>
    </form>
  );
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  return value;
}
