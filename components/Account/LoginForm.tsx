"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { OtpResendTimer } from "@/components/Account/OtpResendTimer";

type Step = "phone" | "code";
type Channel = "telegram_otp" | "sms";

export function LoginForm({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<Channel>("telegram_otp");
  const [retryAfterSec, setRetryAfterSec] = useState(60);
  const [smsLeft, setSmsLeft] = useState(0);
  const [resendKey, setResendKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (smsLeft <= 0) return;
    const id = window.setTimeout(() => setSmsLeft((left) => left - 1), 1000);
    return () => window.clearTimeout(id);
  }, [smsLeft]);

  async function requestCode(
    event?: FormEvent,
    nextChannel: Channel = "telegram_otp",
  ) {
    event?.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, method: nextChannel }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        retryAfterSec?: number;
        smsAfterSec?: number;
        method?: Channel;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Не удалось отправить код");
      }

      const nextMethod = data.method === "sms" ? "sms" : nextChannel;

      setChannel(nextMethod);
      setRetryAfterSec(data.retryAfterSec ?? 60);
      setSmsLeft(nextMethod === "telegram_otp" ? (data.smsAfterSec ?? 20) : 0);
      setResendKey((key) => key + 1);
      setStep("code");
      setCode("");
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
    const channelLabel = channel === "sms" ? "sms" : "telegram";

    return (
      <form className="account-form account-form--login" onSubmit={verifyCode}>
        <p className="account-form__hint">
          код отправлен в {channelLabel} на номер {phone.trim() || "…"}.
        </p>

        <label className="cart-field">
          <span className="cart-field__label">код из {channelLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="1234"
            required
          />
        </label>

        <button
          type="submit"
          className="cart-page__primary-btn account-form__submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "проверка…" : "войти"}
        </button>

        <OtpResendTimer
          seconds={retryAfterSec}
          resetKey={resendKey}
          disabled={status === "loading"}
          onResend={() => void requestCode(undefined, channel)}
        />

        {channel === "telegram_otp" && smsLeft <= 0 ? (
          <button
            type="button"
            className="cart-page__text-btn account-form__secondary"
            disabled={status === "loading"}
            onClick={() => void requestCode(undefined, "sms")}
          >
            не пришло? получить по sms
          </button>
        ) : null}

        <button
          type="button"
          className="cart-page__text-btn account-form__secondary"
          disabled={status === "loading"}
          onClick={() => {
            setStep("phone");
            setCode("");
            setMessage("");
            setChannel("telegram_otp");
            setSmsLeft(0);
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
    <form
      className="account-form account-form--login"
      onSubmit={(event) => void requestCode(event)}
    >
      <p className="account-form__hint">
        вход по номеру телефона — пришлём код в telegram. если не придёт, можно
        получить по sms. отдельная регистрация не нужна.
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
        className="cart-page__primary-btn account-form__submit"
        disabled={status === "loading"}
      >
        {status === "loading" ? "отправка…" : "получить код"}
      </button>

      {message ? (
        <p className="cart-page__status cart-page__status--error">{message}</p>
      ) : null}
    </form>
  );
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  return value;
}
