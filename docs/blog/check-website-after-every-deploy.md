---
slug: check-website-after-every-deploy
title: "How to Check Your Website Automatically After Every Deploy"
excerpt: "To check a website after every deploy, start a scan from your pipeline - a GitHub Actions step, a Netlify deploy notification or a Vercel webhook - that compares the live pages with an approved baseline. Tests prove the code works; a post-deploy check proves the pages people see still have their titles, scripts, links and buttons."
seoTitle: "Check Your Website After Every Deploy (GitHub Actions, Netlify, Vercel)"
seoDescription: "Add a post-deploy check to GitHub Actions, Netlify or Vercel that compares live pages with an approved baseline and alerts you when a release changed something important."
primaryKeyword: "check website after deploy"
secondaryKeyword: "post deploy monitoring"
tags: Deploys, Developers, Monitoring
---
**Short answer:** after your production deploy finishes, have your pipeline call a *post-deploy check* that loads your important live pages and compares them with an approved baseline - status, SEO tags, key buttons, scripts and screenshots. If the release changed something that matters, you hear about it minutes after shipping instead of days later from a customer.

{{toc}}

## Why do broken deploys pass CI?

Unit and integration tests check your code. They rarely check the rendered, public page:

- a CSS change hides the signup button on one breakpoint,
- a template refactor drops the canonical tag or sets `noindex`,
- an environment variable is missing in production only, so analytics never loads,
- a CMS entry published with the release changes a headline or a price.

The build is green, the server answers 200 OK, and the page is wrong.

## What should a post-deploy check look at?

- **Status and redirects** of your key pages.
- **SEO tags**: title, meta description, canonical, robots meta, H1.
- **Conversion elements**: signup, checkout and contact buttons exist, are visible and point to the right place.
- **Scripts**: analytics, tag manager and payment scripts are still present.
- **Visual diff**: a full-page screenshot against the baseline.
- **Internal links** that start failing.

A smoke test that fetches the homepage and checks for 200 catches outages; it does not catch any of the above.

## GitHub Actions: a post-deploy step

Store your check URL as a repository secret and call it after the production deploy step. With MyKavo, that URL is the website's **deploy hook**; the optional note labels the check with your commit.

```yaml
- name: Check the site with MyKavo
  if: success()
  env:
    MYKAVO_DEPLOY_HOOK: ${{ secrets.MYKAVO_DEPLOY_HOOK }}
  run: |
    curl -fsS -X POST "$MYKAVO_DEPLOY_HOOK" \
      -H "Content-Type: application/json" \
      -d "{\"note\":\"${GITHUB_SHA::7}\"}"
```

The same one-line `curl` works in GitLab CI, CircleCI, Bitbucket Pipelines or Jenkins.

## Netlify: deploy notifications

In your Netlify site's deploy notification settings, add an **outgoing webhook** for the *Deploy succeeded* event pointing at the check URL. Netlify posts its deploy details as JSON; a check that ignores the body works as is. Note that deploy previews and branch deploys fire the event too, so on busy sites prefer a step that runs only for production.

## Vercel: CLI step or webhook

If you deploy from CI with the Vercel CLI, add the `curl` step right after the production deploy command. On plans with webhooks, you can instead point a *deployment succeeded* webhook at the check URL - but it also fires for preview deployments, so the CI step is usually the better fit.

## What happens when the check finds something

A good post-deploy check gives a verdict, not a log dump:

- **Nothing important changed** - a "deploy verified" notification, and the check in your history with the release note.
- **Something changed** - the changes ranked by severity, each with previous and current values and before-and-after screenshots.
- **Expected changes** from the release can be approved in one go, which updates the baseline for the next deploy.

MyKavo's deploy checks work exactly this way. The full setup, with security notes, is in the [deploy checks docs](https://mykavo.app/docs/platform/deploy-checks).

{{cta}}

{{faq}}
Q: What is a post-deploy check?
A: A check that runs right after a production deploy and verifies the live site - status, SEO tags, key buttons, scripts and visual layout - against an approved baseline, so regressions that tests miss are caught within minutes.
Q: How do I run a website check after a GitHub Actions deploy?
A: Add a step after your production deploy that sends a POST request to your monitoring tool's deploy hook, for example with curl, using a URL stored as a repository secret.
Q: Do Netlify and Vercel webhooks fire for preview deployments?
A: Generally yes. Netlify's deploy-succeeded notification and Vercel's deployment webhooks also fire for previews, so if you deploy previews often, trigger the check from a CI step that runs only for production.
Q: Is a smoke test enough after a deploy?
A: A smoke test catches outages. It does not catch a missing button, a changed canonical, a dropped analytics script or a layout shift - which is what most broken deploys look like.
{{/faq}}
