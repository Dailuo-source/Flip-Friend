# Flip Friend: handoff notes

Business app for **Refinished by Cecilia**, Gary and Cecilia's furniture flipping business. Tracks projects (pieces bought to flip), hours per step, supplies and supply use, listings and market interest, sales and profit against monthly goals, and business spending (kept separate from Gary's audit expense sheet). Used on their Samsung Android phones (Chrome PWA). Dark mode only.

**Home furniture is never part of this app.** Pieces kept for the family (old #9, #12, #33) were deliberately left out.

## Where things live

| Piece | Location |
| --- | --- |
| Live app | https://flip-friend.pages.dev/ (Cloudflare Pages from `main` of `Dailuo-source/Flip-Friend`) |
| Google account | **refinishedbycecilia@gmail.com** owns everything Google. In Gary's Chrome it is the second account (`/u/1/`); `/u/0/` is his personal account. Always check which account is on screen before creating or deploying anything. |
| Database | Google Sheet **Flip Friend**, id `1YqmdD-ECb-fIfLYIwwTyN0O6OXOiaqmR0h293Gddb0E`, in the business Drive's **Flip Friend** folder. |
| Pictures and receipts | Drive folders next to the sheet: `Project photos`, `Inspiration`, `Receipts/yyyy-MM` (made by the script). Pictures stay private and are sent to the app through the API, then cached on the phone (IndexedDB `ff-img`). |
| Backend | Apps Script project **Flip Friend** bound to the sheet (script id `1IJM_uOLskm8FdL_SyJ-ktHj5s8J1YHTEySjQQTSZ5IiHlyx3lsXb4td6`); source is `Code.gs` here. One web app deployment ("Flip Friend app", Execute as refinishedbycecilia, Anyone), deployed Oct 17, 2026. Its /exec link is saved in Script Properties (`WEB_APP_URL`) and shown by the sheet menu; keep updating that same deployment so the phone link never changes. |
| Opening the script | **Extensions → Apps Script fails for the business account** (Google multi-account bug: "unable to open the file"). Open it directly instead: `https://script.google.com/u/1/home/projects/<script id>/edit`, and check the avatar says Cecilia. |
| Connecting a phone | Sheet menu **Flip Friend → Show app key and phone link** gives `https://flip-friend.pages.dev/#api=<exec>&key=<key>`; the app stores both in localStorage (`ff.api`, `ff.key`). |
| Old tracker | `1XsPVOGyllMuS-1o-lc1IAOZGysFvE3xGWb1IbAkjPd4`. Only the "Project Schedule" and "Furniture Cost Breakdown" tabs may be read; never the others. History was copied from them on Oct 17, 2026. |

## Data model (tabs, matched by header name)

- **Projects**: No, Name, Status (Not started / In progress / Listed / Sold / Disposed), Started, Price paid, List price, Sold price, Delivery fee, Sold on, Profit, Time to sell, Days worked, Notes, Picture (Drive file id), Inspiration notes, Updated, ID, Sold through. New project numbers are assigned by the server as highest number + 1 (old tracker had two #16s; the second is **16B**). Imported profits are copied exactly as recorded (some old rows leave the delivery fee out); the app only recalculates profit when a sale or cost is edited. #37's profit was corrected to $557.07 (the tracker had used the listing price).
- **Time log**: Project, Step, Label, Date, Hours, Notes, ID. Steps come from Settings (Pick-up, Prep, Prime, Paint, Poly, Finish & list). A step shows as done once a later step has time, or the piece is listed/sold. The timer lives in the phone's localStorage (`ff.timer`).
- **Listings**: Project, Date, Event (Listed / Price drop / Relisted / Check-in / Sold), Price, Platform, Views, Saves, Inquiries, Notes, ID. Interest numbers are cumulative: the latest non-blank value of each wins.
- **Supply use**: Project, Date, Supply, Amount, Unit, Cost, Shared with, Notes, ID. Reusable supplies (sandpaper etc.) split the cost across the projects picked.
- **Supplies**: Name (generic, e.g. "Water-based poly"), Category, Unit, On hand, Avg cost per unit, Reusable, In use, Low at, ID.
- **Barcodes**: Barcode, Product name, Supply. Scans look up a free product database (upcitemdb trial, 100/day) then `genericName()` in index.html maps brand names to shelf names.
- **Expenses**: app-only spending; receipts are OCR'd with Drive's text recognition (temporary Google Doc, then trashed).
- **Goals**: Year, Month, Profit goal, Pieces min, Pieces max, ID. Editable in the app (Money → Profit & loss → Edit goals).
- **Inspiration**: Project, Picture, Caption, ID.
- **Settings** (hidden, read-only to the app): Steps, Step details, Statuses, Units, Supply categories, Expense categories, Listing events, Platforms.

## App structure

- `index.html` is built from `src/` (`sh build.sh`). Bottom tabs: Home, Projects, Listings (market performance), Supplies, Money (Expenses / Profit & loss). Project page sub-tabs: Steps, Costs, Listing, Inspiration.
- Sync is the same pattern as Climb Buddy / Pantry Pal: optimistic, batched ops, 60 s polling, offline queue in localStorage (`ff.queue`), last state cached (`ff.cache`).
- The phone's back button closes the top thing open (scanner, form, project) via one guard history entry (`syncGuard`).

## Changing things

- App files: edit `src/`, run `sh build.sh`, bump `CACHE` in `sw.js` (currently `flip-friend-v1`), commit and push to `main`. Cloudflare deploys in about a minute.
- Code.gs: paste into Apps Script (opened from the sheet **in the business account**) and redeploy (Deploy → Manage deployments → pencil → New version).
- Commits use author `Claude <noreply@anthropic.com>`.
- Testing: a Node mock of SpreadsheetApp/DriveApp/UrlFetchApp running Code.gs plus Playwright (route `script.google.com` to `api()`) covers the full flow.
