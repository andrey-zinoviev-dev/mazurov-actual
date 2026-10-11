type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

/** JSON-LD для поисковиков (Schema.org). */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
