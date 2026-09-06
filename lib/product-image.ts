const PRODUCT_IMAGE_BASE =
  "https://storage.yandexcloud.net/mazurovbucket";

/** URL картинки товара: явное поле `image` или `{id}.jpg` в бакете */
export function productImageUrl(product: {
  id: number;
  image: string | null;
}): string {
  if (product.image) {
    if (
      product.image.startsWith("http://") ||
      product.image.startsWith("https://")
    ) {
      return product.image;
    }
    return `${PRODUCT_IMAGE_BASE}/${product.image.replace(/^\//, "")}`;
  }

  return `${PRODUCT_IMAGE_BASE}/${product.id}.jpg`;
}
