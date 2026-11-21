import type { ProductDto } from "@catalogue/contracts";
import { useState } from "react";

type ProductImageProps = Pick<ProductDto, "imageUrl" | "title"> & {
  className?: string;
  eager?: boolean;
  decorative?: boolean;
};

export function ProductImage({
  imageUrl,
  title,
  className,
  eager,
  decorative,
}: ProductImageProps) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <img
      className={className}
      src={failedUrl === imageUrl ? "/placeholder.svg" : imageUrl}
      alt={decorative ? "" : title}
      width={480}
      height={360}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
