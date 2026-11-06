/**
 * An "AI Overview" for a non-blog page: the direct answer to the page's main
 * search question, then a few hard takeaways. Blog posts get theirs from the
 * post's excerpt and keyTakeaways; tool and landing pages get theirs here.
 *
 * Rules for writing one (keep them, they are why the box works):
 *  - `answer` is 2-3 sentences that answer the page's search intent on their
 *    own, plainly, as if quoted out of context by an answer engine.
 *  - 3-4 `takeaways`, each one concrete fact or step, under ~25 words.
 *  - Only claims the page itself (or MyKavo's real product) supports. No
 *    invented statistics, customers or rankings. No em or en dashes.
 */
export interface PageOverview {
  answer: string;
  takeaways: string[];
}
