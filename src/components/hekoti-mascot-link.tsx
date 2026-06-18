import Image from "next/image";
import Link from "next/link";

export function HekotiMascotLink({
  lang,
  className,
  priority = false,
  imageSize = 120,
}: {
  lang: string;
  className?: string;
  priority?: boolean;
  imageSize?: number;
}) {
  return (
    <Link href={`/${lang}`} className={className} aria-label="Hekoti">
      <Image src="/hekoti.png" alt="" width={imageSize} height={imageSize} priority={priority} />
    </Link>
  );
}
