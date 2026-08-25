import Link from "next/link";

export default function AdminStubPage() {
  return (
    <main className="admin-stub">
      <h1>Админка</h1>
      <p>
        Новый интерфейс админки появится позже. Пока заказы и товары
        управляются через текущую панель.
      </p>
      <p>
        <a
          href="https://mazurov-rental.ru/admin_panel.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть admin_panel.html
        </a>
      </p>
      <Link href="/" className="admin-stub__back">
        [ на главную ]
      </Link>
    </main>
  );
}
