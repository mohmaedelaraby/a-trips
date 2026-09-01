# A Trip — Product & Business Specification

**Document purpose:** the build brief for the developer. It describes *what the business is*, *what the product does*, and *what to build first*. Reference site to clone: [trip.com](https://www.trip.com/).

> **Open item:** the client's three Arabic voice notes have not yet been reviewed. Everything here comes from structured discovery plus a study of trip.com. Anything the client specified that differs from the below should override it.

---

## 1. The business

**A Trip** is an Egyptian tour operator selling **inbound Egypt tourism** direct to travellers online — hotels, day tours, attraction tickets, multi-day packages, Nile cruises and airport transfers.

The defining characteristic, and the thing that makes this different from trip.com: **A Trip owns its inventory through direct contracts with hotels and operators.** It is not a middleman reselling someone else's API feed. There is no Amadeus, no Booking.com feed, no bed bank.

That has three consequences the developer must understand, because they shape every decision downstream:

1. **No supplier integrations to build.** No GDS, no aggregator APIs, no reconciling the same hotel arriving from four suppliers under three different names. This removes what would normally be 60% of an OTA build.
2. **The admin portal is not a side feature — it is half the product.** Since nobody else supplies the data, the client's ops team enters and maintains every hotel, every tour, every price and every date of availability by hand. If the admin tooling is slow or confusing, the site sells rooms that don't exist. In an own-inventory model, admin UX *is* inventory accuracy.
3. **Margins are better and pricing is controlled.** No 25–30% OTA commission. A Trip can undercut Viator and Booking.com on the same product, which is the core commercial advantage.

**Who buys:** international tourists visiting Egypt (English, paying in USD) and Arabic-speaking regional travellers from the Gulf. The site is bilingual English/Arabic with full right-to-left support.

**How they find it:** organic search is the primary acquisition channel, which is why the whole site is built for SEO. Secondary channels are paid search and WhatsApp enquiries — the latter matters far more in this market than a Western travel site would suggest.

---

## 2. Using trip.com as the reference

Clone trip.com's **user experience** — layout, page structure, booking flows, component patterns. Do not clone its **business model**, which is a global aggregator operating at a scale A Trip has no need to imitate.

**Clone this:**
- Homepage structure: hero with a tabbed search widget, deals strip, destination tiles, themed collections, trust signals, SEO link blocks, footer
- Hotel search: filter sidebar, sort bar, rich result cards, map view with price bubbles
- Hotel detail: photo gallery, sticky sub-nav, and above all the **room type × rate plan table**, which is the most important screen on the site
- Activities: option → date → time slot → quantity → book flow
- Checkout: stepped, with a sticky price summary and an itemised total
- The component library: date pickers, guest selectors, price displays, review badges, filter primitives

**Deliberately skip this:**

| Trip.com feature | Why it doesn't apply |
|---|---|
| "1,619,949 properties · 168M reviews" counters | A Trip's real numbers are small. Quoting them hurts. Use different credibility instead: licence number, years operating, guide credentials, travellers hosted |
| Supplier price-comparison rows | One supplier per room. There is nothing to compare |
| Sponsored/"Ad" result slots | No third parties to sell placement to. Use the slot for cross-sell instead |
| Multi-tier loyalty (Silver→Black Diamond) | Vastly over-engineered here. A simple returning-guest discount does the same job |
| App-exclusive pricing | There is no app |
| Fabricated urgency ("3 people viewing") | Only ever show this from real data. Fake scarcity is a legal risk in several markets and a trust risk for a small brand whose reputation is its only asset |

**Do more than trip.com on one thing: cross-selling.** Trip.com's verticals are siloed. A Trip's entire commercial advantage is that a single customer books a hotel *and* a tour *and* a transfer. So: tours on every hotel page, hotels on every tour page, transfers offered in both checkouts, and a "complete your trip" block on every confirmation page. That confirmation-page slot is the highest-converting cross-sell moment on the site and should be treated as a primary feature, not a footer afterthought.

---

## 3. Scope: the full vision, and what ships first

### The five product types

| Product | What the customer picks | How availability works | How price works |
|---|---|---|---|
| **Hotels** | Room type + rate plan + dates | Rooms available per night | Per room per night; extra adult/child supplements |
| **Day tours & attraction tickets** | Tour option + date + time slot + how many people | Seats per departure time | Per person; adult/child/infant bands |
| **Multi-day packages** | Package + departure date + room sharing | Seats per departure | Per person, varying by sharing (single/double/triple) |
| **Nile cruises** | Cabin type + sailing date | Cabins per sailing | Per person in cabin, varying by sharing |
| **Airport transfers** | Vehicle class + pickup/dropoff + date/time | Usually unlimited; sometimes a daily cap | Fixed price per vehicle |

### ⚠️ Phasing — read this before estimating

**All five bookable in 2–3 months is not achievable by one developer.** Realistic effort is 8–11 months: roughly 3–4 weeks of shared foundation, then 3–5 weeks per product type (hotels 6–8), because each one needs its own inventory model, pricing model, search UI, detail page, booking flow, voucher *and* full admin screens. The admin half is what gets forgotten in estimates.

**Recommended phase 1 (~11–12 weeks): make day tours and attraction tickets fully bookable. Everything else launches as content plus enquiry.**

Why tours go first:
- **Fastest to revenue.** A $40–90 ticket is a near-impulse purchase, often booked days ahead — sometimes by tourists already in Egypt. Real transactions and real conversion data within weeks of launch.
- **The only SEO surface that can realistically be won.** "Giza pyramids day tour", "Abu Simbel from Aswan", "Luxor balloon price" and their Arabic equivalents are high-intent and thinly contested. A hotel page, by contrast, will not outrank Booking.com — ever.
- **Simplest model, so it gets finished properly.** One date, one time, one seat count, one per-person price. But it still exercises the entire platform — payments, holds, vouchers, refunds, bilingual content, admin — which proves the foundation before the hard verticals arrive.
- **Cheapest mistakes.** Oversell a tour by two and ops adds seats to the van. Oversell a cruise cabin and there is a stranded customer in another country.

**Packages, cruises and hotels still earn money in phase 1** — as fully-SEO'd pages with an enquiry form, a WhatsApp button, and an ops-issued payment link that creates a real booking in the same system. In this market those high-value products (£900–2,500) are *consultative* sales that close with a human over WhatsApp anyway. This captures that revenue for roughly a tenth of the cost of a booking engine, and the enquiry volume tells you whether self-serve is worth building at all.

A useful consequence: because ops handles those bookings manually, **deposits can be taken by hand via payment links.** So full online prepayment applies only to self-serve tour checkout, and no scheduled-payment machinery is needed for launch.

**Later phases:** transfers as a bookable add-on → packages as real inventory (with deposit/balance payments) → cruises (cheap once packages exist, same machinery) → hotels last. Worth challenging whether standalone hotel search is *ever* worth building: hotels may serve better as a component inside packages than as a vertical competing head-on with the world's largest OTAs.

**Build the data model for all five product types from the start**, even though only tours get wired up. The schema is cheap now and expensive to retrofit — and it makes deferring the other verticals a cheap decision rather than an argument.

---

## 4. Site structure

```
/                                   Homepage
/hotels                             Hotel search + results
/hotels/[city]                      City hotel listing (SEO landing page)
/hotels/[city]/[hotel-name]         Hotel detail
/things-to-do                       Tours & attractions landing
/things-to-do/[city]                City activity listing
/things-to-do/[city]/[activity]     Activity detail
/nile-cruises                       Cruise listing
/nile-cruises/[cruise]              Cruise detail
/packages                           Multi-day tour listing
/packages/[package]                 Package detail with itinerary
/transfers                          Airport transfer booking
/checkout/...                       Booking flow
/booking/[reference]                Booking confirmation / lookup
/account/...                        Customer account area
/guide/[article]                    Travel guide content (SEO)
/admin/...                          Staff back-office
```

Every URL exists in both languages with locale-specific slugs: `/en/things-to-do/cairo/pyramids-day-tour` and `/ar/...`.

---

## 5. Screen specifications

### 5.1 Homepage

**Header** — two rows. Top: language switcher (EN/AR), currency (USD/EGP/EUR/SAR), sign-in or account menu, 24/7 support link. Main: logo, then product tabs — Hotels · Tours & Activities · Attractions · Nile Cruises · Airport Transfers · Egypt Guide. Clicking a tab swaps the search widget below without navigating away.

**Hero + search widget** — full-width Egypt photography (Giza at golden hour, a felucca on the Nile) with a dark overlay so text stays readable. A white search card floats over it, overlapping the bottom edge.

The widget has tabs matching the nav, each with its own fields:
- *Hotels:* destination or hotel name (autocomplete grouped by City / Region / Landmark / Hotel) · check-in–check-out (two-month calendar, shows night count) · guests & rooms (stepper panel) · Search
- *Tours & Activities:* "Search places and things to do" · optional date · Search, with category chips beneath
- *Transfers:* pickup · dropoff · date · time · passengers
- *Cruises:* route (Luxor→Aswan / Aswan→Luxor) · departure month · nights (3/4/7) · guests

**Then, in order down the page:**
1. **Promo strip** — a coloured band with a claimable coupon ("10% off your first booking"). Highest-yield conversion element on the page.
2. **Trust bar** — four proof points. *Not* property counts. Use: licensed Egyptian tour operator · Egyptologist-guided tours · 20,000+ travellers hosted · 24/7 support in Cairo.
3. **Deals carousel** — promotional cards with discount ribbons, from-prices with strikethrough, countdown timers on flash offers.
4. **Destination tiles** — tabbed by region (Nile Valley · Red Sea · Cairo & Giza · Desert & Oases · Sinai). Each tile: photo, city name, hook ("142 hotels · from $38"). Links to pre-filtered search.
5. **Top experiences** — activity cards carousel.
6. **Recommended hotels** — hotel cards, personalised if logged in.
7. **Themed collections** — "Nile-view hotels in Luxor", "Family-friendly Red Sea resorts", "Boutique stays in Old Cairo". Each is a curated landing page; these exist both to capture undecided browsers and to generate SEO pages.
8. **Why book with us** — four icon + heading + line items: licensed operator, free cancellation on most bookings, English & Arabic guides, local emergency line.
9. **Guest reviews** — real quotes with name, country flag, rating, and which product.
10. **WhatsApp / newsletter band** — where trip.com puts its app download. Same job: keep the relationship.
11. **SEO link columns** — small grey text links: "Hotels in Cairo", "Things to do in Luxor", "Hotels near the Egyptian Museum".
12. **Footer** — Support · About · Legal · Partners · Destinations, plus payment logos, tourism licence number, social links.

### 5.2 Hotel search results

**Layout:** sticky condensed search bar at top (editing any field re-runs the search in place) · breadcrumbs · left filter sidebar ~280px, sticky and independently scrollable · main results column · map thumbnail in the sidebar that opens full-screen.

On mobile, filters and sort become two sticky bottom buttons opening full-screen sheets.

**Filters, in order:** map thumbnail · applied-filter chips with clear-all · popular filters · price range (dual slider, per night) · guest rating (9+ Great, 8+ Very good…) · star rating · property type (incl. Nile cruise boats) · meals (breakfast / half board / full board / all-inclusive) · location (neighbourhoods with counts; distance from landmark) · bed type · **room features (Nile view, Pyramid view, sea view — highly commercial in Egypt)** · amenities · payment options · booking policy (free cancellation, instant confirmation) · accessibility.

Rules for every filter group: show 5–6 options then "Show more (12)" · every option shows a live result count · zero-result combinations grey out and disable · filters apply instantly and write to the URL so results are shareable · show a skeleton while reloading.

**Sort:** Recommended (default) · Price low→high · Price high→low · Guest rating · Star rating · Distance. Plus a "price per night / total for stay" toggle — this materially changes perceived price and should be the user's explicit choice.

**The hotel result card** — image left, content middle, price right:
- *Image:* photo with a "1/48" counter, hover arrows to flip through several images without leaving the page, a promo ribbon top-left, a save-heart top-right
- *Content:* hotel name · gold stars · property type · location line with distance ("Giza · 1.2 km from Giza Pyramids") · review badge ("**7.7**/10 Good · 1,284 reviews") · **a short pulled review quote** · amenity icons · the specific room the price refers to ("Deluxe Double · 28m² · 1 King bed") · label chips
- *Chips:* green for benefits (Free cancellation, Breakfast included, Instant confirmation), amber for genuine urgency (Only 2 left at this price), blue for info (Best price guarantee)
- *Price:* strikethrough original · large current price · "per night" · total for stay including taxes in small grey · discount pill · **"Check Availability"** button (deliberately lower-commitment than "Book now", and accurate — it goes to the room table, not checkout)
- *Sold out state:* card greys, price replaced with "Sold out for your dates", CTA becomes "See similar hotels"

**Map view:** split screen, price-bubble pins rather than generic markers, hovering a card highlights its pin, "Search this area" on pan, layer toggles for landmarks and airports.

**Pagination:** 20–25 per page, auto-load on scroll for two batches, then a "Show more" button so the footer stays reachable. Preserve scroll position when returning from a detail page. Numbered pagination at the bottom for SEO.

**Empty state:** show applied filters with one-click removal and a suggestion — "Removing 'Pool' would show 47 more hotels" — plus nearby-city fallbacks.

### 5.3 Hotel detail page

Sections in order:

1. **Sticky sub-nav** (appears on scroll) — hotel name, review score, anchors (Overview · Rooms · Amenities · Policies · Reviews · Location), and a price + "Select room" button that jumps to the room table.
2. **Photo gallery** — desktop mosaic (one large + 2×2 grid) with "View all 48 photos". Opens a full-screen lightbox with a thumbnail filmstrip and a category rail: All · Rooms · Pool · Restaurant · Exterior · **Guest photos** (keeping official and guest photos separate is a real trust signal).
3. **Identity block** — name, gold stars, full address with map link, distance to landmarks, large review badge, save and share, plus a right-rail price box ("from US$86/night" + Select room).
4. **Overview** — description with read-more, "What guests love" drawn from reviews, popular amenities grid.
5. **Room & rate table — the core screen.** See below.
6. **Amenities** — grouped by category with free/paid markers, "Show all" modal.
7. **Policies** — check-in/out times, cancellation, children & extra beds with age bands, breakfast price, pets, ID requirements, tourism tax disclosure.
8. **Reviews** — overall score, category bars (Cleanliness, Location, Service, Facilities, Value), keyword chips with counts that filter the list when clicked, filters by traveller type and language, individual cards with photos and management responses.
9. **Location** — interactive map with tabbed nearby lists (Attractions / Transport / Restaurants), each showing distance.
10. **Things to do near this hotel** — activity carousel. *Primary cross-sell. Make it prominent.*
11. **Similar hotels** and **Recently viewed**.
12. **FAQ accordion** — "Does this hotel have a pool?", "How far is it from the Pyramids?". SEO value plus genuine pre-sale answers.
13. **Sticky bottom booking bar** on mobile.

#### The room & rate table

The single most important interaction on the site. Two nested levels: **room type** (the physical product) → **rate plan** (the commercial terms).

Above the table: an editable dates/guests bar, plus filter chips for the table itself (Free cancellation · Breakfast included · Pay at hotel) so a 30-row table can be pruned to four.

**Room type group header:** thumbnail (opens a room modal with photos, size, bed, view, amenities), room name, size in m², bed configuration, view, and a "Room details >" link.

**Rate plan rows** beneath each room type, columns left to right:

| Column | Contents |
|---|---|
| Rate & inclusions | Rate name ("Bed & breakfast", "Non-refundable saver"), then green ticks: ✓ Breakfast for 2 · ✓ Free Wi-Fi |
| **Cancellation** | The most-scanned cell. Green "Free cancellation before 25 Aug, 18:00" or grey "Non-refundable". A Details link opens the full penalty schedule as a timeline |
| Payment | "Pay now" / "Pay at hotel" / "No prepayment needed" |
| Occupancy | Person icons for max guests, plus "Extra bed available (+$20)" |
| Price | Strikethrough was-price · bold current price · "per night" · total for stay incl. taxes in small grey · discount pill |
| Action | Room quantity dropdown + **"Reserve"** button |

Show only the cheapest rate per room type by default, with "3 more rate options ▾". This is the difference between a scannable page and a wall of forty rows.

Clicking Reserve goes straight to checkout with that room, rate and quantity pre-selected.

### 5.4 Tours & attractions

**Listing page** — hero search, category tabs, then filters: travel date (Today / Tomorrow / pick) · category · rating (4.0+ / 4.5+) · guarantees (instant confirmation, free cancellation, mobile ticket) · price range · duration (under 3h / 3–6h / full day / multi-day) · language (English / Arabic / French / German) · group type (private / small group / join-in) · departure city.

**Activity card:** image with corner badges (Free cancellation, Instant confirmation, discount pill) · title · meta row (6 hrs · English · private) · location · rating with review count · social proof ("2,400+ booked") · **availability line ("Book now for today" / "for tomorrow")** — a strong conversion signal · "From US$44.57".

**Activity detail page:**
- Header: title, rating, location, opening hours, a ranking badge ("No. 3 of Best Things to Do in Cairo"), save/share
- Gallery (same pattern as hotels)
- Quick-facts strip: duration · languages · group size · mobile ticket · instant confirmation · free cancellation · hotel pickup
- Highlights bullets first, then full description
- **Itinerary timeline** for tours: numbered stops with photo, name, time spent, and visit-vs-pass-by distinction
- **The booking module** (right rail on desktop, bottom sheet on mobile) — a strictly ordered flow:
  1. **Pick an option** — cards for each package ("Standard entry ticket", "Skip-the-line + guide", "Private full-day with lunch"), each showing inclusions as chips, cancellation terms, confirmation type, and a from-price. Selected card gets a coloured border.
  2. **Pick a date** — inline calendar with **prices printed in each date cell**, unavailable dates greyed and unclickable, sold-out visually distinct from past, plus a "next available date" shortcut.
  3. **Pick a time slot** — pill buttons ("09:00", "11:00 — 3 left", "14:00 — Sold out"). Skip entirely for open-dated tickets.
  4. **Pick participants** — stepper rows per category with age bands and unit prices: Adult (12+) $44.57 · Child (3–11) $22.30 · Infant (0–2) free. Enforce min/max inline ("Minimum 2 adults"), not as an error after submission.
  5. **Add-ons** — hotel pickup (+$10), lunch upgrade (+$15), camel ride (+$20), Great Pyramid interior entry.
  6. **Running total** updating live, then "Book now" with reassurance beneath: "Free cancellation until 26 Aug · No booking fees".
- What's included / excluded — two columns, green ticks and red crosses
- Know before you go — meeting point with mini-map and written address, pickup window, what to bring, dress code, accessibility, age/health restrictions
- **Cancellation policy** as plain language *plus* the exact deadline computed for the chosen date — not just the generic rule
- How to redeem — "Show the mobile voucher at the entrance", validity window
- Reviews (showing which package each reviewer booked)
- Cross-sell: nearby attractions · often booked together · **hotels near this attraction**

**Cruises** reuse this template: options become cabin categories × board basis, dates become fixed sailing departures, plus a deck plan and itinerary map.

**Transfers** are form-first rather than gallery-first: pickup, dropoff, date, time, flight number, passengers, luggage — then vehicle class options (Sedan up to 3 · Minivan up to 7 · Private with meet-and-greet) each with photo, capacity icons and a fixed total. Show "Free waiting time: 60 minutes on airport pickups" prominently.

### 5.5 Checkout

Applies to every product: a step indicator (1 Details → 2 Payment → 3 Confirmation) · sticky order summary in the right rail, collapsing to an expandable top bar on mobile · **a countdown timer** ("We'll hold this price for 15:00") which is both honest urgency and inventory protection · guest checkout allowed with an optional account-creation checkbox · the total never changes between steps without an explicit callout.

**Step 1 — Details.**

*Hotels:* lead guest first/last name (Latin characters, as on passport — say so) · email with a "your confirmation goes here" hint · country code + mobile · guest names per room · nationality and country of residence · **estimated arrival time** (reduces no-shows) · special requests, both free text and quick checkboxes (non-smoking, high floor, twin beds, honeymoon setup) clearly labelled "subject to availability".

*Activities:* lead traveller details · per-participant name and age where required · **pickup hotel** (searchable list) or address, noting that pickup time is confirmed later and typically 30 minutes before start · flight number for transfers · dietary requirements · emergency contact for adventure products.

*Upsells on this step — this is where margin lives:*
- Add breakfast (+$12 per person per night)
- **Add an airport transfer (from $25)** — the highest-value cross-sell for an inbound operator
- Add a Giza half-day tour (from $45) — one or two curated cards, one click to add
- Room upgrade ("Nile view for +$20/night")
- Early check-in / late checkout

*Price summary sidebar:* room × nights × rooms with the nightly rate · subtotal · **taxes and fees itemised and expandable** (VAT, tourism tax, service charge) · add-ons each with a remove × · promo code input · total, large, in display currency with the charge currency noted if different · the cancellation deadline restated in green · trust icons.

**Step 2 — Payment.** Payment method radio cards with logos. Card form with live card-type detection, name, expiry, CVV with tooltip, billing country. "Save this card" for logged-in users. 3-D Secure as a modal or redirect with a clear "don't close this window". Terms checkbox with the cancellation policy repeated verbatim directly above the button. Final CTA states the amount: **"Pay US$172 and confirm booking"**. Then a processing interstitial: "Do not refresh — we're confirming your room."

**Step 3 — Confirmation.**
- Green tick, "Your booking is confirmed"
- **Booking reference**, prominent and copyable
- Full recap: property/activity, address with map link, phone, dates and times, room or package, guest names, inclusions
- Payment summary: paid, method, anything payable on arrival
- Cancellation policy with the exact deadline and a "Cancel this booking" link
- Actions: **Download voucher (PDF)** · Email confirmation · Add to calendar · View in My Bookings
- "What's next" checklist
- **"Complete your trip" cross-sell** — transfer, tours, cruise, one-click each. The highest-converting slot on the entire site
- Account-creation prompt for guest checkouts

For activities confirmed instantly, show the **voucher/QR code directly on the page**. If confirmation is pending operator approval, use an **amber** header (not green) with "We're confirming with the operator — you'll hear within 24 hours" and no voucher yet.

### 5.6 Account area

- **My Trips dashboard** — next trip as a hero card with a countdown, alerts needing attention
- **My Bookings** — tabs for Upcoming · Completed · Cancelled · Awaiting payment, filterable by product type. Each row: thumbnail, name, reference, dates, status pill, amount, quick actions
- **Booking detail** — the confirmation page made permanent, plus Manage booking (change → shows any fee and new price before confirming; cancel → **states the refund amount and penalty explicitly before the final click**, then shows a refund tracker), download voucher, contact support pre-filled with the reference (WhatsApp as the primary channel), write a review, book again
- **Saved / wishlist** — with price-change indicators ("Price dropped $12 since you saved it")
- **Travellers** — saved traveller profiles so repeat bookings don't require re-typing participant details
- **Profile · payment methods · coupons · my reviews · settings · invoices**

---

## 6. Business rules

### Availability
- Hotels: rooms available per room type per night. A 3-night stay needs all three nights available.
- Tours: seats per departure time. Ops generates departures from a repeating rule ("daily 08:00, except Fridays, October–April") rather than creating each one by hand.
- Cruises: cabins per cabin type per sailing date.
- Transfers: usually unlimited, optionally a daily cap per vehicle class.
- **Ops can "stop sell" any product or date instantly** without deleting it — essential when a hotel calls to say they're full.
- **Overbooking must be impossible.** When two people try to book the last seat simultaneously, exactly one succeeds. This needs handling at the database level, not in application logic. See the appendix.

### Holding inventory during checkout
When a customer starts checkout, the seats or rooms are **held for 20 minutes** so nobody else can take them mid-payment. If payment doesn't complete, the hold lapses and the inventory returns automatically.

### Pricing
- Prices vary by **season** (date ranges) — ops sets these as ranges, not per day.
- Hotels: per room per night, with supplements for extra adults and children by age band.
- Tours: per person, with adult/child/infant bands.
- Packages and cruises: per person, varying by room sharing — single travellers pay a **single supplement**, which is expressed as its own price row rather than a special rule.
- Transfers: fixed per vehicle.
- **Prices display in USD** with optional EGP/EUR/SAR display. Store both what was displayed and what was actually charged on every booking — refunds at a later exchange rate otherwise lose money.

### Cancellation
- Policies are rule sets: "100% refund until 7 days before, 50% until 24 hours before, none after."
- Each rate plan or tour option can have its own policy.
- **The policy is locked in at the moment of booking.** If ops later changes a product's policy, existing bookings keep the terms the customer agreed to. This is how travel disputes are won.
- Show the **exact computed deadline** ("Free cancellation before 25 Aug, 18:00"), never just the generic rule.

### Confirmation type
Each product is either:
- **Instant** — customer pays, booking is confirmed immediately, voucher issued. Most tours and tickets.
- **On request** — customer pays, ops checks with the hotel or operator, then confirms or declines. Declines trigger an automatic full refund. Use this for contracted hotels and cruises where allotments aren't guaranteed. It's dramatically cheaper to operate than guaranteed allotments and is the recommended default for hotels.

### Snapshots
When a booking is made, freeze onto it: the price breakdown, the cancellation policy, and the product name and description in both languages. Ops editing a tour description or raising next season's prices must never alter what a past customer sees on their voucher.

---

## 7. Admin portal

**Half the build. Treat its usability as a feature, not plumbing** — the ops team will use it every single day, and the accuracy of the public site depends entirely on them keeping up.

**Products:** create and edit hotels, tours, packages, cruises, transfers · bilingual content editor (English and Arabic side by side) · photo upload with drag-to-reorder · room types / tour options / cabin types / vehicle classes · inclusions and exclusions · itinerary builder for tours and packages · meeting points and pickup zones · publish/unpublish.

**Availability:** a calendar view per product · **bulk editing is essential** — set allotment across a date range, apply to selected days of the week, generate departures from a recurrence rule · one-click stop-sell · a dashboard warning for products whose availability hasn't been updated recently (the single best defence against selling rooms that don't exist).

**Pricing:** rate plans per product · seasonal price ranges · child and occupancy supplements · promo codes · optional extras.

**Bookings:** search by reference, name, email, date or product · full booking detail with a complete timeline of everything that happened · confirm or decline on-request bookings · cancel with automatic refund calculation from the locked-in policy · issue refunds · resend vouchers · add internal notes · **create a booking manually** (for phone and WhatsApp sales).

**Enquiries / leads** (phase 1, for packages and cruises): incoming enquiries with assignment, status and notes · **a quote builder that produces a payment link**, so a manually-sold package still becomes a real booking in the system with the same voucher and refund path as a self-serve one.

**Content:** destination pages, themed collections, travel-guide articles, FAQs, homepage banners.

**Reporting:** bookings and revenue by period and product, conversion, top products, upcoming departures with passenger manifests.

**Users & roles:** admin, ops, content, finance. Two-factor authentication mandatory for staff.

---

## 8. Money

### How payment works
The client banks with **CIB (Egypt) and holds a USD account that can send and receive.** They will link this to **PayPal and use PayPal as the global payment method.**

> **Verify before building checkout:** PayPal restricts Egyptian-registered accounts to *sending* rather than receiving, and this is a licensing restriction rather than a bank-account one — linking a USD account does not by itself lift it. If the client has a PayPal account that demonstrably receives, it may be registered outside Egypt. **Get written confirmation from PayPal that the account can receive and withdraw commercial payments at volume before the developer builds around it.** If it can't, the fallback is an Egyptian gateway (Paymob, Kashier or Geidea) with a USD-enabled merchant account, which settles into the same CIB USD account.
>
> Build payments behind a **thin provider adapter** either way, so swapping providers is a day's work rather than a rewrite. Include a stub provider from week one so checkout can be built and tested before any merchant account exists.

### Rules
- **Full prepayment** online for self-serve tour bookings.
- **Deposits are handled manually by ops** via payment links for packages and cruises in phase 1 — no scheduled-payment system needed yet.
- **Hosted checkout only.** The customer is redirected to the payment provider and card details never touch A Trip's servers. This keeps compliance obligations minimal and is non-negotiable.
- **Only a verified webhook from the payment provider may confirm a booking.** The customer returning to the site is a hint to go check the payment status — never proof of payment. Browsers close, networks drop; the webhook is the truth.
- Every payment event must be safe to process twice. Providers retry.

### Things the client needs to know
- **Travel is classed as high-risk by card processors** (deferred delivery — the money is taken now, the service happens months later). Expect a **rolling reserve of roughly 5–15% held for 90–180 days**. This is a real working-capital cost and is the most commonly overlooked item in travel payment projects. Full prepayment widens the exposure and therefore the reserve.
- **Start merchant onboarding in week one.** Verification takes weeks and is very likely the real critical path — more so than development.
- **Chargebacks run several times higher than retail.** Defences to build in from the start, because they can't be added retroactively: capture the customer's explicit acceptance of the cancellation policy with a timestamp, keep the emailed confirmation, retain the policy snapshot, and make self-service cancellation easy — a refund is far cheaper than a chargeback.

---

## 9. Languages and content

- **English and Arabic**, every page, with proper right-to-left layout in Arabic — mirrored sidebars, reversed carousel arrows, correct alignment throughout. This must be built in from the first commit; retrofitting it costs weeks.
- Display prices in Latin digits even in Arabic — that's the regional convention for booking sites.
- Separate URLs and separate slugs per language, correctly cross-linked for search engines.
- **Content is a client deliverable and a genuine launch risk.** Forty tours × two languages × photography is weeks of the client's work, and it is not on the developer's critical path *unless it's allowed to become one*. Hand the client a content template in week one and make phase 2 sign-off conditional on twenty products being loaded. The client already has inventory content — confirm early whether it's bilingual and photo-complete or English-only.

---

## 10. Roadmap

| Phase | What | Duration |
|---|---|---|
| **0 — Decisions** | Confirm PayPal receiving capability in writing; start merchant onboarding; brand/design direction; content template to client; domain and legal entity details | 1 week, blocking |
| **1 — Foundation** | Project setup, design system with RTL from day one, bilingual routing, accounts, media handling, email, admin shell, SEO fundamentals, payment adapter with stub provider. **Data model covering all five product types.** | 3 weeks |
| **2 — Tours, end to end** | Admin: tour management, departures, availability calendar with bulk edit, pricing, policies. Storefront: listings, filters, search, detail page, booking module. Checkout with holds, payments, vouchers, emails. Order management. | 4 weeks |
| **3 — Everything else as content + leads** | SEO'd itinerary pages for packages and cruises, cruise and transfer pages, enquiry forms, lead pipeline, WhatsApp CTAs, quote builder producing payment links | 2 weeks |
| **4 — Launch hardening** | Performance, accessibility both directions, load-testing the booking path, legal pages, analytics, Search Console, **ops team UAT on real data**, soft launch | 1.5 weeks |

**≈11.5 weeks to launch.** Add 2–3 weeks if visual design isn't settled, or adapt a template.

*After launch:* transfers as bookable add-on, promo codes, reviews, multi-item cart (3–4 wks) → packages as real inventory with deposit payments (5–6 wks) → cruises (3–4 wks) → hotels (6–8 wks).

---

## 11. Risks

| Risk | Why it matters | What to do |
|---|---|---|
| **Ops doesn't keep availability current** | Highest real-world risk. The site is only as accurate as daily data entry; stale data means selling rooms that don't exist | First-class admin UX with bulk tools; stale-inventory dashboard warnings; a named owner with a daily routine; train during UAT, not after launch |
| **Merchant onboarding delays launch** | Verification takes weeks; more likely to be the critical path than code | Start week one; stub provider so checkout is built regardless; manual payment links as fallback |
| **Overbooking** | Costs a customer their holiday and the brand its reputation | Database-level locking; test the concurrent last-seat case explicitly |
| **SEO takes 4–9 months** | The entire acquisition strategy rests on organic, and organic is slow | Reset client revenue expectations **in writing**; publish content from phase 3; budget paid search from day one; get WhatsApp live immediately |
| **Trust barrier** | An unknown Egyptian brand asking a stranger abroad for full prepayment converts poorly | Visible cancellation policy, real reviews, licence number and address, named team, 24/7 WhatsApp, professional photography |
| **Bilingual content production** | Weeks of client work that can quietly become the blocker | Template in week one; make phase sign-off conditional on products loaded |
| **Scope creep back to five verticals** | The most likely way the timeline dies | The data model already covers all five, so "later" is genuinely cheap — use that to make deferral easy |
| **One developer** | No redundancy | Boring proven technology, no clever abstractions, written runbook, admin good enough that ops can self-serve most incidents |
| **Rolling reserves squeeze cash flow** | 5–15% held 90–180 days on a prepayment model | Budget for it explicitly; revisit deposit-vs-full-payment commercially if it bites |
| **Regulatory** | Egyptian tourism licensing for online sales, consumer terms, e-invoicing | Client's lawyer and accountant confirm before launch. Not a developer task |

---

## 12. Open questions for the client

1. **The voice notes** — reconcile this document against what the client actually said. Highest priority.
2. **PayPal** — written confirmation that the account can receive and withdraw commercial payments at volume.
3. **Hotels** — guaranteed allotments or on-request confirmation? On-request is far cheaper to build and is the recommendation regardless.
4. **Cruises** — own boats or contracted cabins? Determines whether inventory is hard-allocated or on-request.
5. **Which products can be sold instant-confirm** and which need an ops check?
6. **Design** — brand direction beyond the logo, or adapt a template? Worth 2–3 weeks either way.
7. **Content** — is existing tour content bilingual and photo-complete, or English-only?

---

## Appendix — Technical notes

Decisions already made, plus the few areas where getting it wrong is expensive.

**Stack:** Next.js (App Router) + TypeScript · PostgreSQL · Prisma · Tailwind + shadcn/ui · Auth.js · next-intl for bilingual routing · Cloudinary for images · Resend for email · Vercel hosting · Sentry. One app, one repo, admin under an `/admin` route group — a separate admin app doubles the work for no benefit at this size.

**Search:** Postgres full-text is sufficient. The catalogue is hundreds of products, not millions. Do not add Elasticsearch or Typesense — it's an extra system to operate for a problem that doesn't exist here.

**SEO — the rendering rule: cache content, never cache inventory.** Product and listing pages are statically generated and revalidated (immediately when ops publishes a change). Live prices and availability load client-side *inside* that cached shell. Crawlers get complete HTML with structured data and an indicative "from" price; humans get live data a moment later. Checkout and admin are never cached. Build in from the start: per-language sitemaps, hreflang with locale-specific slugs, canonical URLs, and JSON-LD for products, offers, breadcrumbs and FAQs.

**Preventing overbooking — the most dangerous code in the project.** Availability must be *calculated* (`total − sold − active holds`), never stored as a mutable number, so expired holds need no cleanup to be correct. Taking a hold must lock the affected rows in a database transaction (`SELECT … FOR UPDATE`, always in a consistent order to avoid deadlocks), re-check capacity, and only then write. Application-level check-then-write **will** oversell under load. Write an integration test that fires N concurrent bookings at the last seat and asserts exactly one wins.

**Payments — the second most dangerous area.**
- Hosted redirect checkout only; card data never touches your servers.
- Only a **signature-verified webhook** changes payment state. The browser redirect merely triggers a status check.
- Store the provider's event ID with a unique constraint so duplicate webhooks are harmless — providers retry, and they will.
- Run a reconciliation job that polls for payments stuck pending, in case a webhook never arrives.
- Handle the ugly case explicitly: **payment succeeded but inventory disappeared.** Never silently fail, never auto-cancel. Move the order to a dedicated state, alert ops immediately, and show the customer an honest "we're confirming, we'll contact you within 2 hours." Then ops rebooks or refunds.

**Bilingual/RTL:** use CSS logical properties (`padding-inline-start`, not `padding-left`) everywhere from the first commit. Review every screen in both languages. Retrofitting RTL is a multi-week tax; doing it from the start costs about a day of discipline.

**Snapshots:** freeze price breakdown, cancellation policy, and bilingual product name/description onto every booking at the moment it's made. Never re-derive them later.
