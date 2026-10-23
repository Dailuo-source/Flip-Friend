# Flip Friend — Brief

> **Claude: read this first.** Open only the files a change touches; use the code map to jump to a function.
> **`web/index.html` is generated** from `src/` by `build.sh` (~130 KB). Never read or edit it; edit `src/`, then run `sh build.sh`. The `src/` files are large too: search for function names.
> At the end of a work session, update **Status** and add one line to **Changelog** (keep about 5).

Business app for **Refinished by Cecilia**, Gary and Cecilia's furniture flipping business: projects (pieces bought to flip), hours per step, supplies and supply use, listings and market interest, sales and profit against monthly goals, and business spending (separate from Gary's audit expense sheet). Samsung Android phones (Chrome PWA) and desktop browsers (wide screens get a desktop layout). Dark mode only.

**Home furniture is never part of this app** (family pieces were deliberately left out).

## Where things live

| Piece | Location |
| --- | --- |
| Live app | https://flip-friend.pages.dev/ (Cloudflare Pages from `main`, build output directory `web`, so only `web/` is published) |
| Google account | **refinishedbycecilia@gmail.com** owns everything Google. In Gary's Chrome it's `/u/1/`; `/u/0/` is his personal account. Always check the account on screen before creating or deploying |
| Database | Google Sheet **Flip Friend**, id `1YqmdD-ECb-fIfLYIwwTyN0O6OXOiaqmR0h293Gddb0E`, in the business Drive's **Flip Friend** folder |
| Pictures and receipts | Drive folders by the sheet: `Project photos`, `Inspiration`, `Receipts/yyyy-MM`. Referenced by Drive file id only; private, sent through the API and cached on the phone (IndexedDB `ff-img`). New inspiration uploads named by `picName()` |
| Backend | Apps Script **Flip Friend** bound to the sheet (script id `1IJM_uOLskm8FdL_SyJ-ktHj5s8J1YHTEySjQQTSZ5IiHlyx3lsXb4td6`); source is `Code.gs`. One deployment ("Flip Friend app", Execute as refinishedbycecilia, Anyone); /exec in Script Property `WEB_APP_URL`. Always update that same deployment so the phone link never changes |
| Opening the script | **Extensions → Apps Script fails for the business account.** Open `https://script.google.com/u/1/home/projects/<script id>/edit` and check the avatar says Cecilia |
| Connecting a phone | Menu **Flip Friend → Show app key and phone link** → `https://flip-friend.pages.dev/#api=<exec>&key=<key>` (stored as `ff.api`, `ff.key`) |
| Old tracker | `1XsPVOGyllMuS-1o-lc1IAOZGysFvE3xGWb1IbAkjPd4`. Only "Project Schedule" and "Furniture Cost Breakdown" may be read; never the others |

## Data model (tabs, matched by header name)

- **Projects**: No, Name, Status (Not started / In progress / Listed / Pending / Sold / Disposed; Pending = buyer committed, counts as open, shows with listings), Started, Price paid, List price, Sold price, Delivery fee, Sold on, Profit, Time to sell, Days worked, Notes, Picture, Inspiration notes, Updated, ID, Sold through. Server assigns new numbers as highest + 1 (there's a **16B**). Imported profits are kept as recorded; profit is only recalculated when a sale or cost is edited.
- **Time log**: Project, Step, Label, Date, Hours, Notes, ID. Steps from Settings (Pick-up, Prep, Prime, Paint, Poly, Finish & list). A step is done once a later step has time, or the piece is listed/sold. Timer in localStorage `ff.timer`.
- **Listings**: Project, Date, Event (Listed / Price drop / Relisted / Check-in / Sold), Price, Platform, Views, Saves, Inquiries, Notes, ID. Interest numbers are cumulative: latest non-blank wins.
- **Supply use**: Project, Date, Supply, Amount, Unit, Cost, Shared with, Notes, ID, Category. Reusable supplies split cost across the projects picked. Category = cost category (blank → `catOf()` guesses: same supply's last pick, then name keywords `CAT_GUESS`, then Other). Costs tab groups by `COSTCATS()` order.
- **Supplies**: Name (generic, e.g. "Water-based poly"), Category, Unit, On hand, Avg cost per unit, Reusable, In use, Low at, ID.
- **Barcodes**: Barcode, Product name, Supply. Lookup via upcitemdb trial (100/day), then `genericName()` maps brands to shelf names.
- **Expenses**: app-only spending; receipts OCR'd with Drive text recognition (temporary Doc, then trashed).
- **Goals**: Year, Month, Profit goal, Pieces min, Pieces max, ID, Sales goal, Margin %. Pieces goal is one number (saved to both min and max; read with `pieceGoal()`). Edit goals (`sheetGoals`) has a Dollars / % of sales switch (`ff.gmode`): in % mode profit goal = sales goal × margin; Plan the year splits a yearly sales goal evenly or by the current month mix.
- **Inspiration**: Project, Picture, Caption, ID.
- **Settings** (hidden): Steps, Step details, Statuses, Units, Supply categories, Expense categories, Listing events, Platforms, Cost categories. Read-only to the app except **Cost categories** (op `set` → `setSetting_`, whitelisted; edited in Costs → Edit categories; renames carry over to Supply use rows).

## App design rules

- Phone tabs: Home, Projects, Listings, Supplies, Money (Expenses / Profit & loss). Project sub-tabs: Steps, Costs, Listing, Inspiration.
- Sync: optimistic, batched ops, 60 s polling, offline queue `ff.queue`, cached state `ff.cache`.
- **Desktop (1024px+)** in `src/3b-desktop.js`: `DESK` sets `body.desk`; sidebar nav, full-width screens, forms as a right side panel. Projects Edit mode keeps drafts in `D.drafts` until Save; a lower list price also logs a Price drop, → Listed adds a Listed event, → Sold needs a sold price and adds a Sold event. Batch expenses log expenses only (no restock). Background re-renders wait while a grid cell has focus (`holdRender`). P&L chart SVG width follows the window so text stays 12px. Shortcuts: N new project, / search, Esc close. Desktop CSS is the `body.desk` block at the end of `1-head.html`.
- Phone back button closes the top thing open via one guard history entry (`syncGuard`).

## Changing things

- App files: edit `src/`, run `sh build.sh`, bump `CACHE` in `web/sw.js` (currently `flip-friend-v10`), commit and push to `main`.
- Code.gs: paste into Apps Script (business account) and redeploy (Deploy → Manage deployments → pencil → New version).
- Commits use author `Claude <noreply@anthropic.com>`.

## Deploying Code.gs

- Web app deployment ID: `AKfycbxI25N4m70gWGzLGllZF2fp7yAvmmtronnHXoCdQMFVoXhY1yeZWYe6LjfKRHprqms-`. Always update this deployment so the /exec URL never changes.
- From this folder, `.clasp.json` points clasp at the script project (rootDir is the repo root, where `Code.gs` is):
  ```
  clasp push
  clasp deploy -i AKfycbxI25N4m70gWGzLGllZF2fp7yAvmmtronnHXoCdQMFVoXhY1yeZWYe6LjfKRHprqms- -d "what changed"
  ```
- Never run `clasp deploy` without `-i`: that creates a new deployment with a new /exec URL. `clasp deployments` lists them.
- clasp is signed in as garyluo.gs@gmail.com, but this project belongs to refinishedbycecilia@gmail.com and runs as that account. Check the deployment still runs as that account after deploying with clasp.

## Code map
API: op-batched like Pantry Pal, plus single calls through `runCall_` for uploads, receipts and barcode lookups.

| File | Lines | What's in it |
|---|---|---|
| `Code.gs` | 573 | `doGet`/`doPost`/`api`, `runCall_`; read/write (`readAll_`, `applyOp_`, `nextProjectNo_`); Drive (`folder_`, `blobFrom_`, `uploadPicture_`, `readPicture_`); receipts (`scanReceipt_`, `parseReceipt_`); `lookupBarcode_`; menu (`onOpen`, `setup`, `showKey`, `setWebAppUrl`, `resetKey`); `buildTab_` |
| `src/1-head.html` | 165 | CSS and markup |
| `src/2-core.js` | 272 | sync (`callApi`, `call`, `enqueue`, `flush`, `normalize`); settings (`setting`, `stepDetail`); money and stats (`calcProfit`, `profitOf`, `listInfo`, `daysToSell`, `stepState`, `monthProfit`, `monthSales`); supplies (`genericName`, `supplyDefaults`); pictures (`idb*`, `loadImg`, `hydrateImages`, `resizeImage`, `uploadPicture`); `toast`, `statusChip` |
| `src/3-views.js` | 326 | `render`, `renderNav`; `viewHome`; `viewProjects` (`projectCard`); `viewProject` (`subSteps`, `subCosts`, `subListing`, `subInspo`, `timerHTML`); `viewListings`; `viewSupplies`; `viewMoney` (`moneyExpenses`, `moneyPnl`) |
| `src/3b-desktop.js` | 290 | `deskNav`, `deskView`, `deskHome`, `deskProjects` (`viewTable`, `editTable`, `bulkBar`, `saveBar`, `saveDrafts`), `deskListed`, `deskSupplies`, `deskExpenses`, `deskBatch` (`batchFiles`, `batchPaste`, `saveBatch`); own listeners (actions start with `dk`) |
| `src/4-actions.js` | 466 | panels (`openSheet`, `syncGuard`, `openProject`); projects (`sheetNewProject`, `sheetEditProject`, `setPicture`); timer (`sheetTime`, `startTimer`, `stopTimer`); listings (`sheetListEvent`, `plusInquiry`, `sheetMarkSold`, `undoSale`, `setPending`); supplies (`sheetUse`, `sheetSupply`, `sheetNewSupply`); money (`sheetGoals`, `sheetExpense`, `sheetReceipt`, `saveReceipt`); `sheetInspo`; barcode (`openScanner`, `handleBarcode`) |
| `web/index.html` | generated | do not read or edit |

## Status
- Working: live on flip-friend.pages.dev with history imported; desktop layout with bulk edit and batch expenses; Pending status; cost categories; sold pieces keep editable price history and market interest.
- Backend: deployment at version 4 (Oct 23, 2026).
- Open: (none recorded)

## Changelog (latest first, keep about 5 lines)
- 2026-10-23: Desktop month table uses four even columns
- 2026-10-23: P&L redesign (mock-up approved): sales/profit side-by-side chart with goal ticks, pieces tiles, month-by-month table with hit bars, year forecast (so far / on plan / at this pace); goals by margin %, single pieces goal, Plan the year
- 2026-10-23: Monthly Sales goal (Goals tab column, Edit goals form, P&L card meter, year summary)
- 2026-10-22: Costs grouped by editable cost categories in step order; sold pieces can still add price history and interest numbers (list price follows the last asking price)
- 2026-10-21: Moved the site files into `web/`; only that folder is published
- 2026-10-22: Trimmed this brief

## Working efficiently
- Find code with search first, then read only the relevant lines. Don't read index.html top to bottom.
- Make small, targeted edits. Never regenerate a whole file.
- Don't open a browser to test unless I ask. I'll test on my phone.
- No subagents unless I ask.
- One task per session. I'll /clear between tasks.
