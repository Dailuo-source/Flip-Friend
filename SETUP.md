# Flip Friend setup

Flip Friend keeps everything in the **Flip Friend** Google Sheet in the refinishedbycecilia@gmail.com Drive.
The app itself is hosted on Cloudflare Pages at https://flip-friend.pages.dev/.

## 1. The Google Sheet (on a computer, signed in as refinishedbycecilia@gmail.com)

1. Open the **Flip Friend** sheet, then **Extensions → Apps Script**. Check the account in the top right is the business one.
2. Replace what's in `Code.gs` with this repo's `Code.gs` and save.
3. Pick **setup** in the function list and press **Run**. Allow the permissions it asks for.
   It adds any missing columns, gives every row an ID, hides the Settings tab, and makes the
   Receipts, Project photos and Inspiration folders next to the sheet.
4. **Deploy → New deployment**, type **Web app**, *Execute as: Me*, *Who has access: Anyone*, then **Deploy**.
5. Back in the sheet, reload, then **Flip Friend → Set web app link…** and paste the Web app URL (ends in `/exec`).

## 2. Each phone

1. In the sheet, **Flip Friend → Show app key and phone link**.
2. Open that link on the phone in Chrome. It connects the app to the sheet and remembers it.
3. Chrome menu **⋮ → Add to Home screen → Install**.

## Changing things later

- **Settings tab** (hidden: right-click any tab → Show sheets): step names, units, categories and platforms.
- **Any tab**: edit or add rows freely. Rows typed in get an ID automatically. Keep the header names.
- **App updates**: bump `CACHE` in `sw.js` whenever the app files change, so phones load the new version.
