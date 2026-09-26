-- Rewrites the excerpts of the September 2026 guides as direct answers.
-- The excerpt now shows in an "In short" box at the top of each post, which
-- is the passage AI answers (Google AI Overviews, ChatGPT, Perplexity) quote.
-- Safe to run more than once. Run it in the Supabase SQL Editor AFTER
-- publish-2026-09-guides.sql (if that one was run before this change).

BEGIN;
UPDATE blog_post SET excerpt = $x$Yes - an automatic plugin, theme or core update can quietly change or break a live WordPress page overnight, with no error you would notice. Keep auto-updates on for security, and pair them with a check that compares your key pages with a known-good baseline after each update, so you learn within minutes which update broke what.$x$, "updatedAt" = now() WHERE slug = 'wordpress-auto-updates-broke-my-site';
UPDATE blog_post SET excerpt = $x$Website change monitoring saves an approved baseline of your important pages, re-checks them on a schedule, and alerts you when something that matters changes - a page that errors, a noindex tag, a changed title or canonical, a missing script or button. Uptime monitoring asks whether a page loads; change monitoring asks whether it is still right.$x$, "updatedAt" = now() WHERE slug = 'what-is-website-change-monitoring';
UPDATE blog_post SET excerpt = $x$To check a website after every deploy, start a scan from your pipeline - a GitHub Actions step, a Netlify deploy notification or a Vercel webhook - that compares the live pages with an approved baseline. Tests prove the code works; a post-deploy check proves the pages people see still have their titles, scripts, links and buttons.$x$, "updatedAt" = now() WHERE slug = 'check-website-after-every-deploy';
UPDATE blog_post SET excerpt = $x$Accidental noindex happens when a live page picks up a noindex robots tag - often from a staging setting, an SEO plugin change or a theme update - and Google then drops it from search. Check the page source or Search Console's URL Inspection, and use a monitor that alerts you the moment a page changes from index to noindex.$x$, "updatedAt" = now() WHERE slug = 'accidental-noindex-how-to-detect';
UPDATE blog_post SET excerpt = $x$A good monthly website report shows a client what was checked, what changed or broke and how it was fixed, plus uptime and performance, on one page they can read in a minute. Lead with outcomes rather than raw data, and send it as a live link so it is always current.$x$, "updatedAt" = now() WHERE slug = 'monthly-website-report-for-clients';
COMMIT;

SELECT slug, left(excerpt, 80) AS excerpt_start FROM blog_post WHERE slug IN ('wordpress-auto-updates-broke-my-site', 'what-is-website-change-monitoring', 'check-website-after-every-deploy', 'accidental-noindex-how-to-detect', 'monthly-website-report-for-clients');
