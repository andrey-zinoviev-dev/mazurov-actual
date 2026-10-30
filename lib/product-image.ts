const PRODUCT_IMAGE_BASE =
  "https://storage.yandexcloud.net/mazurovbucket";

/** URL картинки товара: строго `{id}.jpg` в бакете */
export function productImageUrl(product: {
  id: number;
}): string {
  return `${PRODUCT_IMAGE_BASE}/${product.id}.jpg`;
}
