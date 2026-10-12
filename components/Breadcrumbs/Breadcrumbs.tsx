import Link from "next/link";
import "./Breadcrumbs.css";

export type BreadcrumbItem = {
  label: string;
  /** Если нет — пункт не ссылка (обычно текущая страница). */
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

/** Видимый trail для пользователей и краулеров (не h1). */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const href = !isLast ? item.href : undefined;

          return (
            <li key={`${item.label}-${index}`} className="breadcrumbs__crumb">
              {index > 0 ? (
                <span className="breadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {href ? (
                <Link href={href} className="breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
