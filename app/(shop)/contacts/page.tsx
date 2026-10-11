import type { Metadata } from "next";
// import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { PageHeading } from "@/components/PageHeading/PageHeading";
import {
  breadcrumbListJsonLd,
  contactsBreadcrumbs,
} from "@/lib/seo-jsonld";
import { SITE } from "@/lib/site";
import "./contacts-page.css";

const PHONE_HREF = `tel:${SITE.phoneE164}`;
const YANDEX_MAP_SRC =
  `https://yandex.ru/map-widget/v1/?ll=${SITE.pickupCoords.lon}%2C${SITE.pickupCoords.lat}` +
  `&z=17&pt=${SITE.pickupCoords.lon}%2C${SITE.pickupCoords.lat}%2Cpm2rdm`;

const contactsTitle = "Контакты";
const contactsDescription =
  "Контакты Mazurov Rental: телефон и адрес самовывоза кинооборудования в Москве.";

export const metadata: Metadata = {
  title: contactsTitle,
  description: contactsDescription,
  alternates: { canonical: "/contacts" },
  openGraph: {
    title: `${contactsTitle} — ${SITE.name}`,
    description: contactsDescription,
    url: "/contacts",
    images: [{ url: SITE.defaultOgImagePath }],
  },
};

export default function ContactsPage() {
  return (
    <section className="contacts-page page-split">
      <JsonLd data={breadcrumbListJsonLd(contactsBreadcrumbs())} />
      {/* <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "контакты" },
        ]}
      /> */}
      <PageHeading
        title="Контакты"
        lead="Телефон и адрес самовывоза кинооборудования в Москве"
      />

      <div className="contacts-page__content">
        <div className="contacts-page__info">
          <div className="contacts-page__block">
            <h2 className="contacts-page__label">телефон</h2>
            <a className="contacts-page__phone" href={PHONE_HREF}>
              {SITE.phoneLabel}
            </a>
          </div>

          <div className="contacts-page__block">
            <h2 className="contacts-page__label">адрес самовывоза</h2>
            <p className="contacts-page__address">{SITE.pickupAddress}</p>
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
