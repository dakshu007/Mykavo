import { Star } from "lucide-react";
import { getPluginReviews, WPORG_REVIEWS_PAGE_URL } from "@/lib/wp-reviews";

/**
 * Real reviews of the WordPress plugin, under the hero's "Running WordPress?"
 * card: the newest 4 and 5 star reviews from WordPress.org, word for word,
 * each linking to the original, next to the plugin's real overall rating.
 * Renders nothing until there is a review worth showing.
 */
export async function HeroWpReviews() {
  const { reviews, rating } = await getPluginReviews();
  if (reviews.length === 0) return null;
  return (
    <section aria-label="Reviews on WordPress.org" className="mx-auto mt-5 w-full max-w-2xl text-left">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#151515]">What WordPress users say</p>
        <a
          href={WPORG_REVIEWS_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-[#6B6B60] underline decoration-[#FFD400] decoration-2 underline-offset-4 hover:text-[#151515]"
        >
          {rating ? (
            <>
              <Star className="size-3.5 fill-[#FFB400] text-[#FFB400]" aria-hidden />
              {rating.average.toFixed(1)} out of 5 from {rating.count} review{rating.count === 1 ? "" : "s"} on WordPress.org
            </>
          ) : (
            "All reviews on WordPress.org"
          )}
        </a>
      </div>
      <ul className={`grid gap-3 ${reviews.length > 1 ? "sm:grid-cols-2" : ""} ${reviews.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {reviews.map((review) => (
          <li key={review.url} className="flex flex-col rounded-xl border border-[#E6E5DF] bg-white p-4">
            <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${i < review.rating ? "fill-[#FFB400] text-[#FFB400]" : "text-[#D9D8D1]"}`}
                  aria-hidden
                />
              ))}
            </span>
            {review.title && <p className="mt-2 text-[13.5px] font-semibold leading-5 text-[#151515]">{review.title}</p>}
            <blockquote className="mt-1 line-clamp-4 flex-1 text-[13px] leading-5 text-[#3d3d38]">“{review.text}”</blockquote>
            <a
              href={review.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 text-[12px] text-[#6B6B60] hover:text-[#151515]"
            >
              {review.author} on WordPress.org
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
