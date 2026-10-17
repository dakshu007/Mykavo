import { ArrowUpRight } from "lucide-react";
import { fontDisplay } from "@/components/landing/style";
import { productHref, type OurProduct } from "@/config/our-products";

/**
 * One card for a product made by the MyKavo team: name, platform, the
 * one-line description from config/our-products.ts and a "Visit" link that
 * opens the product's own site in a new tab, tagged ?ref=mykavo.
 */
export function OurProductCard({
  product,
  headingLevel = "h3",
}: {
  product: OurProduct;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-6">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]">
        {product.platform}
      </p>
      <Heading className={`${fontDisplay} mt-3 text-[22px] leading-snug text-[#151515]`}>
        {product.name}
      </Heading>
      <p className="mt-2 flex-1 text-[14px] leading-6 text-[#151515]/70">{product.description}</p>
      <a
        href={productHref(product)}
        target="_blank"
        rel="noopener"
        className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-[#151515] bg-[#151515] px-5 py-2.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]"
      >
        Visit {product.name}
        <ArrowUpRight className="size-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </article>
  );
}
