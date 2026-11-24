# Thayer Creations

A static engineering-project journal hosted with GitHub Pages. Project posts, direct image URLs, and download links are managed through Supabase.

## Set up the project database

1. In the Supabase project used by Anonymouse Photos, open **SQL Editor** and run `supabase-setup.sql`.
2. In **Authentication > Users**, create or use the admin login for the site and copy its user UUID.
3. Add that user to the project's admin allowlist:

   ```sql
   insert into public.project_admins (user_id)
   values ('PASTE-ADMIN-USER-UUID-HERE');
   ```

4. `supabase-config.js` is configured with the same Supabase project URL and public publishable key as Anonymouse Photos. If you use another Supabase project, replace those values with its Project URL and public anon/publishable key. Never put a `service_role` or secret key in this file.

Run the setup SQL again on an existing database to apply schema updates; it removes the unused project category column, adds a month-based project date (backfilled from each post's creation date), and creates and seeds the links table.

The public key is intended for browser use. Row-level security lets anyone read published projects and links, but only users listed in `project_admins` can create, edit, publish, or delete posts and links. Draft posts are only visible to signed-in project admins.

## Write project posts

Open the site and choose **Admin sign in**. The project form supports a title, month and year, card summary, cover-image URL, formatted story, multiple optional gallery images and Immich videos, and optional downloadable-file links. The month and year can be changed when editing a post and are what visitors see as the project date. Click **Add image link** or **Add video link** for each gallery item. Gallery images need a direct image URL that returns the photo itself; an Immich `/share/` page is an HTML viewer, not an image URL. Videos use Immich public share links and display the Immich viewer in the Build gallery. This site does not upload or copy those files. Share links must be public and active; anyone who can view the published project can open its video links. Immich must allow its share page to be embedded; if its security headers block framing, adjust the Immich or reverse-proxy frame policy.

Use the story toolbar for headings, bold and italic text, lists, quotes, links, and code blocks. The site sanitizes formatted content before saving and displaying it. Choose **Save draft** to save work without publishing it; drafts can be incomplete and remain visible only to signed-in project administrators. Choose **Publish project** to publish a new project or a draft, or **Save changes** to update a published project. Published project titles should be unique so their generated URL slugs do not conflict.

For cross-origin file links, the browser or file host may choose to display the file instead of downloading it. Configure the file host to send a download response if a forced download is required.

## Awesome Links

The **Awesome Links** page is a curated set of maker resources organized by type. Use the filter above the table to show one type at a time. Sign in with a project administrator account to add, edit, or delete links. Running `supabase-setup.sql` creates the links table and seeds it with starter resources; changes made on the site are saved in Supabase.

## Quick tools

The **Quick tools** page links to small engineering utilities. The Voltage Divider calculator solves for a missing input voltage, resistor, or output target; calculated values are rounded to hundredths. Resistor values support Ω, kΩ, and MΩ, with arrow controls that step through the selected E3, E6, or E12 series (E6 is the default). A shared R1/R2 tolerance selection adds worst-case output voltage and deviation bounds to the copyable results. The summary identifies the E-series when both resistor values match, or shows N/A otherwise.

Battery Builder estimates series voltage for LFP, 3.7 V lithium-ion, lithium-sulfur, sodium-ion, NiMH, lead-acid, alkaline, and silver oxide cells. A nominal 12 V lead-acid battery typically contains six 2 V cells. Alkaline and silver oxide profiles represent primary cells and must not be recharged; lithium-sulfur cells may also be primary. Enter a series count or choose and enter a minimum voltage target or maximum voltage limit; the other field calculates automatically, and clearing the input lets you switch fields. If neither is entered, four series cells are assumed. Minimum targets round the count up, while maximum limits round it down. Enter a parallel cell count, minimum pack capacity, or minimum continuous current to size the pack; clear that field to use another. If none is entered, one parallel cell is assumed. Use cell capacity and either a C rating or a continuous current rating; clear the rating field to enter the other. After calculating, all fields are editable and results update automatically. Editing pack capacity or current sizes the parallel count up; editing a cell specification keeps the parallel count. Target fields show the achieved value when focus leaves them, and values that cannot be calculated remain blank. The results can be copied, and pack energy in Wh is estimated from capacity in Ah and nominal voltage.

The table lists 10% increments plus 5% and 95%; the graph uses 5% increments. These profiles are illustrative only, with intermediate values interpolated between 10% profile points; they are not cell-specific discharge curves or safe charging instructions. Verify all voltages, ratings, protection, and charging requirements against the actual cell and equipment specifications.

Select **Custom** to name a cell and enter its nominal per-cell voltage and per-cell SOC voltages. The 0% and 100% voltages are required and serve as the assumed minimum and maximum for series sizing; other SOC rows are optional. Missing values are linearly interpolated between entered points and marked "(calculated)" in the result table. The graph connects points at 5% increments; interpolated values are estimates, not measurements. Hide or show the input table with its toggle. Paste a column of voltages, or matching SOC and voltage columns, from Excel or Google Sheets into the first desired voltage field. Spreadsheet rows must match the displayed SOC order. Reset clears the custom inputs.

The new chemistry assumptions use approximate nominal voltages and illustrative ranges informed by examples: [lithium-sulfur](https://en.wikipedia.org/wiki/Lithium%E2%80%93sulfur_battery), [sodium-ion](https://en.eastups.com/u/cms/en/202507/24172453d4wn.pdf), [alkaline](https://data.energizer.com/pdfs/E91NA0426.pdf), and [silver oxide](https://data.energizer.com/pdfs/silveroxide_appman.pdf). The intermediate profile values are illustrative, not measurements from those sources.

## Chat Share

The **Chat Share** page creates a two-word, three-number room code. The other person opens the page on their computer and types the same code; both browsers derive the room and AES-256-GCM key from it with PBKDF2. Messages and file chunks are additionally carried over WebRTC's encrypted data channel. Supabase Realtime is used only for temporary WebRTC connection signaling; message and file contents are not sent to Supabase or stored by the site.

Both people must keep the page open while chatting or transferring files. When creating a room, the host can choose a Small (2 MiB), Medium (4 MiB), or Large (8 MiB) transfer buffer; the selection applies in both transfer directions, with larger settings allowing more data in flight at the cost of more memory. In supported browsers, enable the screen wake lock switch to keep the display awake while the room is open; it pauses while the page is hidden and is released when you leave the room. Incoming files are automatically accepted from the person in the room. In browsers with the File System Access API, the receiver chooses a destination folder once per page session and the page streams encrypted files there as they arrive, with receiver acknowledgments to limit buffering; there is no app-imposed file-size cap in this mode. Existing filenames are preserved by adding a suffix rather than overwriting. Browser, disk-space, and connection limits still apply, and interrupted transfers do not resume. Browsers without folder access buffer received files in memory, so very large transfers depend on available memory and may fail if the browser runs out. Only share the room code with someone you trust. Because the short room code is the only shared secret, this is intended for quick temporary sharing, not highly sensitive information. The site must be opened over HTTPS (GitHub Pages already serves it over HTTPS).

## Trace Runner

Double-click the site logo to open **Trace Runner**, a small circuit puzzle. Rotate each trace clockwise to connect the battery to the LED; use **Reshuffle** to start a new arrangement. Completing the circuit unlocks **Super Ball Adventure**, which embeds the Scratch game player.

## Publish the site

The `CNAME` file is set to `ThayerCreations.com`. Configure that domain's DNS for the GitHub Pages site and set the repository's Pages publishing source to the `ThayerCreations` folder (or deploy that folder's contents as the Pages root). Enable HTTPS in the repository's Pages settings after DNS verification.
