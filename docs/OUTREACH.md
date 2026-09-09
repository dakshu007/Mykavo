# Getting the first ten users

The product is further along than the demand for it. This is the plan to fix
that, and the tool that makes it one command instead of fifty.

## The advantage worth using

MyKavo works on a stranger's website without their permission - it reads
public pages, the same as any search engine. So outreach can lead with
something true and specific about the recipient's own site instead of a pitch:

> "Your pricing page has carried a noindex tag since your last deploy - it has
> been invisible to Google for three weeks."

That earns a reply. "Would you like to try my monitoring tool" does not.

## The tool

```bash
pnpm --filter worker exec tsx src/scripts/prospect.ts domains.txt \
  --csv prospects.csv --sender "Your Name"
```

`domains.txt` is one domain per line; `#` comments are ignored.

For each site it prints the health score, the single most alarming finding
with a real URL from that site, and a paste-ready email. The CSV is for
tracking who you contacted and what you led with.

Flags: `--pages` (default 40), `--delay` (ms between sites, default 3000),
`--sender`, `--csv`.

### It refuses to guess

Two cases produce no email, deliberately:

- **COULD NOT AUDIT** - the crawl reached one page and found an HTTP error.
  That looks identical whether the site is dead or the firewall blocked an
  unknown crawler, and the second is far more common. Emailing a stranger that
  their homepage is a 404 when they simply blocked a bot is the worst possible
  first impression. Open it in a browser before deciding anything.
- **Nothing worth leading with** - the site is clean. Skip it. Inventing a
  problem to have something to say is how outreach becomes spam.

### Be a good guest

It obeys robots.txt, crawls ~40 pages rather than 1,500, runs one site at a
time and pauses between them. Keep it that way. The goal is a conversation.

## The two weeks

**Days 1-3 - build the list.** 50 small web/WordPress agencies. They are
visible in r/Wordpress, r/agency, WordPress Facebook groups, Post Status, and
- since you are in India and can reach them on WhatsApp in their own timezone -
local agencies nobody else is selling to. Most list client work in a
portfolio; that is your target.

**Days 4-10 - ten sends a day.** Send the ONE finding, not the report. Offer
the full list as the reply. 70 sends at a 10-15% response rate is 7-10
conversations, which is the ten.

**Days 11-14 - talk to whoever replies.** Not a demo. One question: *"What
broke on a client site last, and how did you find out?"* That answer tells you
which of the eleven built phases actually matters.

## What not to do

- **Do not wait for SEO.** The 35 public pages will work in 4-8 months. That is
  not a first-ten strategy.
- **Do not launch on Product Hunt yet.** One shot; spend it with testimonials.
- **Do not build features.** The next line of code should answer something a
  real user said.

## The thing that will actually stop you

Five sends, no replies, feeling stupid, back to coding - because code answers
in seconds and people answer in days.

Measure **sends**, not replies. Ten a day is entirely within your control.
Replies are not.
