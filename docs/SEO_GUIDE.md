# SEO Guide for plekk

How to improve search visibility, discoverability, and performance for parkplekk.com.

---

## What You Already Have

- **Root layout:** Strong default title, description, keywords, Open Graph, Twitter cards, canonical URL, JSON-LD (Organization + WebSite with SearchAction).
- **Page-level metadata:** Contact, Help, Privacy, Terms each have their own `title` and `description`.
- **Keywords in layout:** `driveway rental`, `parking`, `hourly parking`, `parking space`, `rent driveway`, `parking near me`, `driveway sharing`, `parking marketplace`, `plekk`.

---

## 1. Technical SEO (Do First)

### Sitemap

- **URL:** `https://www.parkplekk.com/sitemap.xml`
- You don’t have one yet. Add it so search engines can discover all important pages.
- **Next.js 14:** Add `app/sitemap.ts` that returns:
  - Home, Find Parking, List Your Driveway, Help, Contact, Privacy, Terms.
  - Optionally: dynamic URLs for each city/region (e.g. `/find-parking?city=halifax`) if you add location landing pages later.
- Submit the sitemap in **Google Search Console** and **Bing Webmaster Tools**.

### Robots.txt

- Add `app/robots.txt` (or route) that:
  - Allows crawlers for `/`, `/find-parking`, `/list-your-driveway`, `/help`, `/contact`, `/privacy`, `/terms`.
  - References `Sitemap: https://www.parkplekk.com/sitemap.xml`.
  - Disallows `/api`, `/auth`, `/profile`, `/admin` if you don’t want those indexed.

### Page-level meta for key flows

- **Find Parking** and **List Your Driveway** are client components, so they don’t export `metadata`. Give them dedicated meta:
  - **Option A:** Wrap each in a small layout that exports `metadata` (e.g. `app/find-parking/layout.tsx` with title/description).
  - **Option B:** Use `generateMetadata` in a parent or use next/head in a shared layout for that segment.
- **Suggested titles/descriptions:**
  - Find Parking: e.g. “Find Parking Near You | Hourly & Daily Spots | plekk” and a description that includes “find parking by city,” “hourly parking,” “driveway rental.”
  - List Your Driveway: e.g. “List Your Driveway & Earn | Rent Your Parking Space | plekk” and a description with “list driveway,” “earn from your parking space,” “host.”

### Core Web Vitals & performance

- Keep images optimized (Next.js `<Image>`, sensible sizes).
- Lazy-load below-the-fold content.
- Minimize blocking JS on critical path; your existing structure is already reasonable.

---

## 2. Should You Write Blog Posts?

**Yes.** Blogs help with:

- **Long-tail keywords** (e.g. “hourly parking near Halifax airport,” “how much can I earn renting my driveway”).
- **Trust and relevance:** Google rewards useful, topical content.
- **Internal linking:** Link from posts to Find Parking and List Your Driveway (with clear anchor text).

**Topic ideas that match intent and keywords:**

- “How to Find Cheap Parking in [City]” (e.g. Halifax, Toronto, Vancouver).
- “How Much Can You Earn Renting Your Driveway?”
- “Hourly vs Daily Parking: When to Choose Which.”
- “Driveway Rental Tips for Hosts: Safety, Pricing, Availability.”
- “Parking Near [Stadium/Event Venue/Airport].”
- “Is Renting My Driveway Safe? What to Know.”

Publish on a **/blog** section with:
- One URL per post (e.g. `/blog/earn-renting-driveway`).
- Unique `title` and `description` per post.
- Include target keywords naturally in the first paragraph and a subheading.
- Add the blog index and post URLs to your sitemap.

---

## 3. Improving Discoverability Through Keywords

### Keyword strategy

1. **Use what you already target:**  
   driveway rental, parking, hourly parking, parking space, rent driveway, parking near me, driveway sharing, parking marketplace. Keep these in layout and use them on key pages (home, find parking, list your driveway).

2. **Add location-based phrases:**  
   “parking [city],” “driveway rental [city],” “hourly parking [city].” Implement via:
   - Location landing pages (e.g. `/find-parking/halifax` or `/parking/halifax`) with a unique title/description and a short intro paragraph, then your existing find-parking UI (pre-filled or filtered by city).
   - Or at least ensure the find-parking page title/description include “by city” or “near you” so you can rank for location queries over time.

3. **Intent-based phrases:**  
   - **Finders:** “cheap parking,” “parking near me,” “hourly parking near [place],” “event parking.”  
   - **Hosts:** “list my driveway,” “rent out my driveway,” “earn from my parking space.”  
   Use these in headings, buttons, and meta descriptions on the relevant pages.

### On-page best practices

- **Titles:** Unique per page; include main keyword and brand (e.g. “Find Parking Near You | plekk”).
- **Descriptions:** 150–160 characters; one primary keyword + a clear benefit or CTA.
- **Headings:** One clear H1 per page (e.g. “Find parking near you” or “List your driveway and earn”); use H2/H3 for sections and secondary keywords.
- **URLs:** Short, readable, with a keyword if it fits (e.g. `/find-parking`, `/list-your-driveway`, `/blog/earn-renting-driveway`).

### Optional: more structured data

- **LocalBusiness** or **Service** for plekk (e.g. Halifax HQ) if you want local SEO.
- **FAQPage** on Help (or a dedicated FAQ page) for common questions.
- **Product** or **Offer**-style markup for listing pages later if you have server-rendered listing detail pages (can be a follow-up).

---

## 4. Quick checklist

| Priority | Action |
|----------|--------|
| High | Add `sitemap.xml` (e.g. `app/sitemap.ts`) and submit in Search Console. |
| High | Add `robots.txt` and reference sitemap. |
| High | Add page-level meta (title/description) for Find Parking and List Your Driveway. |
| Medium | Expand keywords in meta/headings with location phrases (“parking by city,” “near you”). |
| Medium | Create a `/blog` and publish 2–4 posts targeting long-tail keywords; link to find-parking and list-your-driveway. |
| Medium | Consider location landing pages (e.g. `/find-parking/[city]`) with unique title/description. |
| Lower | Add FAQ schema on Help (or FAQ page); consider LocalBusiness if you focus on a specific region. |

---

## Summary

- **Technical:** Add a sitemap and robots.txt, and give Find Parking and List Your Driveway their own meta so they can rank for “find parking” and “list driveway” style queries.
- **Content:** Yes, write blog posts; use them for long-tail and location keywords and link to your main product pages.
- **Keywords:** Keep core terms in layout and key pages; add location and intent phrases in titles, descriptions, and headings; optionally add location landing pages and more structured data as you grow.
