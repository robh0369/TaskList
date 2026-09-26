# Home Tasks

A shared chore and project list for a two-person household. It installs on your phones like an app, and it's free to host on GitHub Pages. You can keep the data in a Google Sheet that you own.

- **Today view:** what's overdue, what's due today and the next 7 days, with a Mine / Everyone toggle
- **Quick add:** type `Mow lawn sat @Sam #Yard every 2 weeks !high` and the date, person, category, repeat rule and priority fill themselves in
- **Recurring chores:** daily, weekly (on chosen weekdays), or monthly, either *on schedule* or *counted from when it was done*
- **Projects:** group bigger jobs into tasks, with a progress ring and a target date. Tasks can also have their own checklist of subtasks.
- **Comments and photos** on any task, for example "before and after" or "here's the model number"
- **Reports:** the workload split between you (by task count or by effort points), completions per week, on-time rate, a breakdown by category, and lists of overdue and stale tasks
- **Works offline:** changes queue up on the phone and sync when you're back online, and light and dark mode follow the phone's setting

---

## 1. Put the app online (GitHub Pages)

1. In this repo on GitHub, go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
2. Merge to `main`, or run the **Test & deploy to GitHub Pages** workflow from the **Actions** tab.
3. The site appears at `https://<your-username>.github.io/TaskList/`.

The app opens in **demo mode** with sample data that's saved on that one device only. That's handy for trying it out. To share one list between both phones, connect a Google Sheet (step 2).

## 2. Connect your Google Sheet

This takes about 5 minutes, and one person does it once.

1. Create a new, blank Google Sheet (for example "Home Tasks").
2. In the Sheet, open **Extensions → Apps Script**.
3. Delete the starter code, paste in everything from [`apps-script/Code.gs`](apps-script/Code.gs), and click **Save**.
4. Set a household passcode. Click **Project Settings** (the ⚙️ icon on the left), then under **Script properties** click **Add script property**. Enter **Property** `PASSCODE` and **Value** your passcode (something neither of you will mind typing once per phone), then **Save**.
5. Back in the **Editor**, choose `setup` in the function dropdown and click **Run**. Google will ask you to authorize the script. Click through **Advanced → Go to (project) (unsafe)**; it says "unsafe" only because this is your own unpublished script. This step creates the tabs (Tasks, Completions, Projects, Comments, Members, Categories) and a Drive folder for photos.
6. Click **Deploy → New deployment**. Click the gear icon, choose **Web app**, and set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
7. On each phone, open the app, go to **Settings** (tap your avatar at the top right), paste the URL, enter the passcode, and tap **Connect**.
8. Install it on the home screen:
   - **iPhone (Safari):** tap Share → **Add to Home Screen**
   - **Android (Chrome):** tap the menu → **Install app**

Tip: after connecting, rename "Partner A" and "Partner B" in **Settings → Household**, and each of you picks yourself under **I am**.

### Updating the script later
If `Code.gs` changes, paste the new version and use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

### How the data is stored
- Each tab is a plain table, so you can read, filter or chart it in Sheets. Avoid editing the header row or the `id` and `_rev` columns by hand.
- Deletes are "soft": the row stays with `deleted = TRUE`, which lets undo work across devices.
- `Completions` is an append-only history of every time a task was done. The reports are built from it, so a recurring chore keeps its full history.
- Photos are saved in a Drive folder called **Home Tasks Photos** and shared as "anyone with the link" so the app can display them. The links are long and random, but don't attach anything sensitive.

### Security, in plain terms
The site itself is public (that's how GitHub Pages works), but it contains no data. Every request to your Sheet must include the passcode, and the script rejects any request without it. The Sheet stays private to your Google account. This is appropriate for a chore list, but not for anything sensitive.

---

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (demo mode)
npm test           # unit tests: recurrence, quick-add parser, reports, store sync, Code.gs contract
npm run build      # production build into dist/
npx playwright test  # end-to-end smoke test on a phone-sized viewport
```

**Stack:** Vite, Preact and TypeScript, with hand-written CSS (design tokens in `src/styles/tokens.css`) and hand-built SVG charts. No runtime dependencies besides Preact, and the build is about 25 KB gzipped.

```
src/
  api/        Backend interface, Google Sheets client, and the in-browser demo backend
  store/      App state, optimistic writes + outbox, background sync
  lib/        Recurrence rules, quick-add parser, reports, date helpers
  views/      Today, Tasks, Projects, Reports, Settings
  components/ Task row, task sheet, charts, shared UI
apps-script/  Code.gs: the Google Apps Script backend
```

**Sync model:** each device keeps a full local copy and an outbox of changes. Every 30 seconds while the app is open, and whenever it regains focus, it sends the outbox and then pulls rows changed since its last sync. The server stamps each row with its own revision counter, so a phone with the wrong clock can't cause missed updates. When both of you edit the same task, the most recent edit wins.
