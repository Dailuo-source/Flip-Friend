# Flip Friend — Brief

> **Claude: read this first.** Open only the files a change touches, and use the code map below to jump to a function instead of reading whole files.
> **`index.html` is generated** from `src/` by `build.sh` (about 130 KB, ~33k tokens). Never read or edit it; edit the `src/` files, then run `sh build.sh`. Even the `src/` files are large, so search for function names rather than reading them whole.
> At the end of a work session, update **Status** and add one line to **Changelog** (keep about 10).

Business app for **Refinished by Cecilia**, Gary and Cecilia's furniture flipping business. Tracks projects (pieces bought to flip), hours per step, supplies and supply use, listings and market interest, sales and profit against monthly goals, and business spending (kept separate from Gary's audit expense sheet). Used on their Samsung Android phones (Chrome PWA) and on desktop in a browser (same link; wide screens get a desktop layout). Dark mode only.

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
- **Desktop (1024px+)**, in `src/3b-desktop.js`: `DESK` flag sets `body.desk`; sidebar nav (`deskNav`), `deskView` routes screens. Home = `deskHome` (Add receipt / Add project buttons, 12-month profit chart with goal marks, Needs a look: listed 21+ days with no inquiries, no check-in for a week, missing listing date, low supplies, not-started pieces; On the bench: in-progress projects). All desktop screens are full width. Money → Profit & loss on desktop: summary + chart left, month table right (`.dk-pnl`); the chart's SVG width is computed from the window width so text stays 12px (re-rendered on resize). Projects = table + project panel on the right (`deskProjects`, `viewTable`), Edit mode = spreadsheet-style grid with drafts kept in `D.drafts` until Save (`editTable`, `bulkBar`, `saveDrafts`; a lower list price also logs a Price drop, status → Listed adds a Listed event, → Sold needs a sold price and adds a Sold event). Listings "Listed now" table with interest bars scaled to the top piece listed now (`deskListed`). Supplies and Expenses tables (`deskSupplies`, `deskExpenses`). Batch expenses (`deskBatch`): drop several receipt photos/PDFs (each goes through the same `receipt` call; PDFs sent as-is), paste tab-separated rows, type rows; logs expenses only (no shelf restock). Background re-renders wait while a desktop grid cell has focus (`holdRender`). Shortcuts: N new project, / search, Esc close. Forms open as a right side panel. Desktop CSS is the `body.desk` block at the end of `1-head.html`.
- The phone's back button closes the top thing open (scanner, form, project) via one guard history entry (`syncGuard`).

## Changing things

- App files: edit `src/`, run `sh build.sh`, bump `CACHE` in `sw.js` (currently `flip-friend-v4`), commit and push to `main`. Cloudflare deploys in about a minute.
- Code.gs: paste into Apps Script (opened from the sheet **in the business account**) and redeploy (Deploy → Manage deployments → pencil → New version).
- Commits use author `Claude <noreply@anthropic.com>`.
- Testing: a Node mock of SpreadsheetApp/DriveApp/UrlFetchApp running Code.gs plus Playwright (route `script.google.com` to `api()`) covers the full flow.

## Code map
API: op-batched like Pantry Pal, plus single calls through `runCall_` for uploads, receipts and barcode lookups.

| File | Lines | What's in it |
|---|---|---|
| `Code.gs` | 573 | `doGet`/`doPost`/`api`, `runCall_`; read/write (`readAll_`, `applyOp_`, `nextProjectNo_`); Drive (`folder_`, `blobFrom_`, `uploadPicture_`, `readPicture_`); receipts (`scanReceipt_`, `parseReceipt_`); `lookupBarcode_`; menu (`onOpen`, `setup`, `showKey`, `setWebAppUrl`, `resetKey`); `buildTab_` |
| `src/1-head.html` | 165 | CSS and markup |
| `src/2-core.js` | 272 | sync (`callApi`, `call`, `enqueue`, `flush`, `normalize`); settings (`setting`, `stepDetail`); money and stats (`calcProfit`, `profitOf`, `listInfo`, `daysToSell`, `stepState`, `monthProfit`, `monthSales`); supplies (`genericName`, `supplyDefaults`); pictures (`idb*`, `loadImg`, `hydrateImages`, `resizeImage`, `uploadPicture`); `toast`, `statusChip` |
| `src/3-views.js` | 326 | `render`, `renderNav`; `viewHome`; `viewProjects` (`projectCard`); `viewProject` (`subSteps`, `subCosts`, `subListing`, `subInspo`, `timerHTML`); `viewListings`; `viewSupplies`; `viewMoney` (`moneyExpenses`, `moneyPnl`) |
| `src/3b-desktop.js` | 290 | desktop layout: `deskNav`, `deskView`, `deskProjects` (`viewTable`, `editTable`, `bulkBar`, `saveBar`, `saveDrafts`), `deskListed`, `deskSupplies`, `deskExpenses`, `deskBatch` (`batchFiles`, `batchPaste`, `saveBatch`); its own click/input/change/key/drop/paste listeners (actions start with `dk`) |
| `src/4-actions.js` | 466 | panels (`openSheet`, `syncGuard`, `openProject`); projects (`sheetNewProject`, `sheetEditProject`, `setPicture`); timer (`sheetTime`, `startTimer`, `stopTimer`); listings (`sheetListEvent`, `plusInquiry`, `sheetMarkSold`, `undoSale`); supplies (`sheetUse`, `sheetSupply`, `sheetNewSupply`); money (`sheetGoals`, `sheetExpense`, `sheetReceipt`, `saveReceipt`); inspiration (`sheetInspo`); barcode (`openScanner`, `handleBarcode`) |
| `index.html` | generated | do not read or edit |

## Status
- Working: first version live on flip-friend.pages.dev (deployed Oct 17, 2026), history imported from the old tracker. Desktop layout with bulk editing and batch expenses added Oct 18, 2026 (front end only, no Code.gs change).
- Open: (none recorded)

## Changelog (latest first, keep about 10 lines)
- 2026-10-19: Desktop P&L chart sized to the screen instead of scaling up; two-column P&L layout
- 2026-10-19: Desktop Home (buttons, Needs a look, On the bench), full-width screens on large monitors
- 2026-10-18: Desktop layout: sidebar, tables, project panel, bulk edit, batch expenses, shortcuts
- 2026-10-18: Turned the handoff notes into a brief (read-first rules, code map, status, changelog)
- 2026-10-17: Record the live deployment and how to open the script
- 2026-10-17: Flip Friend: first version
