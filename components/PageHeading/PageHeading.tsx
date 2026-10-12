import "./PageHeading.css";

type PageHeadingProps = {
  title: string;
  /** Короткая SEO-подпись под h1 */
  lead?: string;
};

/** Заголовок страницы: один h1 + SEO-подпись. */
export function PageHeading({ title, lead }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <h1 className="page-heading__title">{title}</h1>
      {lead ? <p className="page-heading__lead">{lead}</p> : null}
    </header>
  );
}
