import { SkeletonPage } from "@/components/keywords/layout";

/** Shown the moment a link is clicked, while the page loads. */
export default function Loading() {
  return <SkeletonPage sections={3} />;
}
