# CasaKept Website — v1

Your marketing site: 5 pages, one shared stylesheet, no build tools required.
Plain HTML/CSS/JS on purpose — easy to read, easy to edit, deploys anywhere.

## Files

```
casakept-site/
├── index.html      Home — hero, services, membership teaser
├── services.html   Full "what's included" guide
├── pricing.html    Memberships + one-time pricing
├── cocina.html     Weekly menu page (edit the menu here every Sunday)
├── book.html       Walkthrough request form
├── css/styles.css  All styling (brand tokens at the top)
└── js/main.js      Mobile menu + scroll animations
```

## Preview it locally (2 minutes)

Option A — just double-click `index.html`. It opens in your browser and works.

Option B — proper local server (better):
1. Install VS Code, open this folder.
2. In Claude Code (or a terminal): `npx serve .`
3. Open the URL it prints (usually http://localhost:3000).

## Before you launch — the swap list

Search each file for these placeholders and replace:
- **(817) 555-0142** → your real business number (get a Google Voice or OpenPhone number first)
- **hola@casakept.com** → your real email
- **casakept.com** → confirm the domain (buy at Namecheap/Cloudflare, ~$10/yr)
- **Booking form** in `book.html`: it currently posts nowhere. Two easy fixes:
  - Deploy on Netlify → add `data-netlify="true"` to the `<form>` tag. Done — submissions appear in your Netlify dashboard and can email you.
  - Or create a free Formspree account → set the form `action` to your Formspree URL.
- When BookingKoala is live, point the "Book" buttons at your BookingKoala booking page instead (or embed their form).

## Deploy free in ~10 minutes

**Netlify (recommended for the form):**
1. netlify.com → sign up → "Add new site" → "Deploy manually" → drag this folder in.
2. Site is live on a netlify.app URL immediately.
3. Domain settings → add casakept.com → follow the DNS instructions.

**Vercel** works the same way (vercel.com → drag & drop), minus the built-in forms.

## After launch (do these the same week)

1. **Google Business Profile** (business.google.com) — this is where local customers
   actually find you. Category: House Cleaning Service. Link the website. Ask every
   early customer for a review.
2. Add the site link to your flyers' QR code (any free QR generator).
3. Submit the site at search.google.com/search-console so Google indexes it.

## Working on this with Claude Code

Open this folder in Claude Code and just describe changes in plain English:
- "Add a testimonials section to the homepage with 3 reviews"
- "Update this week's Cocina menu: swap caldo de res for pozole rojo"
- "Add a Spanish version of every page with a language toggle"
- "Make the hero to-do list items check themselves off as the page loads"

Claude Code edits the files, you refresh the browser, repeat. This folder is also
the starting point for the customer app later — same brand tokens, same copy.
