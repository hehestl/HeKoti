import Image from "next/image";
import Link from "next/link";

export function HekotiMascotLink({
  lang,
  className,
  priority = false,
}: {
  lang: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={`/${lang}`} className={className} aria-label="Hekoti">
      <Image src="/hekoti.png" alt="" width={120} height={120} priority={priority} />
    </Link>
  );
}
