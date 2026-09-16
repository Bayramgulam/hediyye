import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { money } from "@/lib/domain";
export function GiftCard({
  gift,
  price,
  itemCount,
  index = 0,
}: {
  gift: {
    slug: string;
    name: string;
    description: string;
    image: string;
    occasion: string;
  };
  price: number;
  itemCount: number;
  index?: number;
}) {
  return (
    <article className="gift-card">
      <Link
        className={`gift-image tone-${index % 3}`}
        href={"/hediyyeler/" + gift.slug}
      >
        <img
          src={gift.image}
          alt={gift.name}
          loading="lazy"
          width="640"
          height="500"
        />
        <span className="gift-tag">{gift.occasion}</span>
        <span className="round-arrow">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="gift-title">
        <Link href={"/hediyyeler/" + gift.slug}>
          <h3>{gift.name}</h3>
        </Link>
        <span>{money(price)}</span>
      </div>
      <p>{gift.description}</p>
      <div className="gift-card-footer">
        <span>{itemCount} məhsul daxildir</span>
        <Link href={`/qutunu-yarat?gift=${gift.slug}`}>
          Fərdiləşdir <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
