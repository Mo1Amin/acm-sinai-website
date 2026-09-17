# ACM Sinai Website

Source of [su.acm.org](https://su.acm.org), the website of the Sinai University ACM Student Chapter.

## Structure

| Path | What it is |
|---|---|
| `site/` | The website exactly as it is uploaded to the server |
| `site/js/main.js` | **All content lives at the top of this file**: tracks, events, gallery albums, high board, current board |
| `site/img/` | Optimized WebP images (team, events, gallery) |
| `src/input.css` | Tailwind source and custom styles |
| `.github/workflows/deploy.yml` | Builds the CSS and uploads `site/` on every push to `main` |

## Updating content

Edit the arrays at the top of `site/js/main.js` and push to `main`:

- **New event:** add an object to `eventsData` with `date: "YYYY-MM-DD"`. It shows under *Upcoming Events* until the date passes, then moves to *Past Events*. `formLink` / `meetingLink` only show while it is upcoming.
- **New album:** add an object to `galleryAlbums`, with images in `site/img/gallery/<album>/` (a full image around 1600px and a `-thumb` around 480px, both WebP).
- **Board change:** edit `highBoard` / `currentBoard`. Leave `photo: ""` to show initials.

If you use Tailwind classes that are not already in the site, run `npm install` then `npm run build` (the workflow also builds on deploy).

## Deploying

The workflow uploads `site/` to the hosting over FTPS. It skips the upload until these repository secrets exist (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `FTP_SERVER` | FTP host of the su.acm.org hosting |
| `FTP_USERNAME` | FTP user |
| `FTP_PASSWORD` | FTP password |
| `FTP_SERVER_DIR` | Optional. Remote folder, for example `public_html/`. Must end with `/` |

After the first deploy, refresh the Facebook link preview with the [Sharing Debugger](https://developers.facebook.com/tools/debug/) (**Scrape Again**).
