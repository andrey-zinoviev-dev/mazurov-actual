import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/PageHeading/PageHeading";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="not-found-page page-split">
      <PageHeading
        title="Страница не найдена"
        lead="Такой страницы нет. Вернитесь в каталог или напишите нам."
      />
      <p className="not-found-page__links">
        <Link href="/">Каталог</Link>
        {" · "}
        <Link href="/contacts">Контакты</Link>
      </p>
    </section>
  );
}
