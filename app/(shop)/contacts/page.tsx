import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import "./contacts-page.css";

const PHONE_HREF = "tel:+79773016613";
const PHONE_LABEL = "+7 977 301-66-13";
const PICKUP_ADDRESS = "Москва, ул. Павла Андреева, 23с10";
const PICKUP_COORDS = { lon: 37.6216427, lat: 55.7206617 };
const YANDEX_MAP_SRC =
  `https://yandex.ru/map-widget/v1/?ll=${PICKUP_COORDS.lon}%2C${PICKUP_COORDS.lat}` +
  `&z=17&pt=${PICKUP_COORDS.lon}%2C${PICKUP_COORDS.lat}%2Cpm2rdm`;

export const metadata: Metadata = {
  title: "Контакты — Mazurov Rental",
};

export default function ContactsPage() {
  return (
    <section className="contacts-page page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "контакты" },
        ]}
      />

      <div className="contacts-page__content">
        <div className="contacts-page__info">
          <div className="contacts-page__block">
            <h2 className="contacts-page__label">телефон</h2>
            <a className="contacts-page__phone" href={PHONE_HREF}>
              {PHONE_LABEL}
            </a>
          </div>

          <div className="contacts-page__block">
            <h2 className="contacts-page__label">адрес самовывоза</h2>
            <p className="contacts-page__address">{PICKUP_ADDRESS}</p>
          </div>
        </div>

        <div className="contacts-page__map">
          <iframe
            src={YANDEX_MAP_SRC}
            title="Карта — адрес самовывоза"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
