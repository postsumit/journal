
# Journal + Habit Scorecard — GitHub Pages Deploy

## Quick deploy (no command line)
1. Create a new repository on GitHub (e.g., `journal-habit`).
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `index.single.html`
   - `.nojekyll` (prevents Jekyll from interfering)
3. Go to **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
   - Click **Save**
4. Wait ~30–60 seconds. Your site will be live at:
   - `https://<your-username>.github.io/journal-habit/`

## Updating later
- Drag-and-drop new versions of the files into the repository and commit—Pages auto-updates.

## Custom domain (optional)
1. Buy a domain and create a DNS **CNAME** record pointing your subdomain (e.g., `journal.yourdomain.com`) to:
   - `<your-username>.github.io`
2. Create a file named `CNAME` (no extension) in the repository root with your custom domain inside, e.g.:
   - `journal.yourdomain.com`
3. GitHub will auto-issue HTTPS.

## Troubleshooting
- If the site loads but looks unstyled, ensure all files are in the **root** of the repo and `.nojekyll` exists.
- If charts don’t load, check that your browser allows third‑party CDNs; the app uses Chart.js via a CDN.
- If you later move the repo to a different name/owner, export your data from the app and re-import at the new URL (data is stored locally per domain).

## Notes
- `index.html` is the file GitHub Pages serves—use this one for the public site.
- `index.single.html` is a self-contained version meant for local testing.
