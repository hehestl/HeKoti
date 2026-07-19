"use client";

import Image from "next/image";
import Link from "next/link";
import { useMascotSrc } from "@/components/mascot-provider";

export function HekotiMascotLink({
  lang,
  className,
  priority = false,
  imageSize = 120,
  src,
}: {
  lang: string;
  className?: string;
  priority?: boolean;
  imageSize?: number;
  src?: string;
}) {
  const mascotSrc = useMascotSrc();
  const imageSrc = src ?? mascotSrc;

  return (
    <Link href={`/${lang}`} className={className} aria-label="Hekoti">
      <Image src={imageSrc} alt="" width={imageSize} height={imageSize} priority={priority} />
    </Link>
  );
}
