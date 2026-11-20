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

## Chat Share

The **Chat Share** page creates a two-word, three-number room code. The other person opens the page on their computer and types the same code; both browsers derive the room and AES-256-GCM key from it with PBKDF2. Messages and file chunks are additionally carried over WebRTC's encrypted data channel. Supabase Realtime is used only for temporary WebRTC connection signaling; message and file contents are not sent to Supabase or saved.

Both people must keep the page open while chatting or transferring files. Files are limited to 25 MB and are held in browser memory until downloaded. Because the short room code is the only shared secret, this is intended for quick temporary sharing, not highly sensitive information. Direct connections may fail on networks that require a TURN relay; no TURN server is configured. The site must be opened over HTTPS (GitHub Pages already serves it over HTTPS).

## Trace Runner

Double-click the site logo to open **Trace Runner**, a small circuit puzzle. Rotate each trace clockwise to connect the battery to the LED; use **Reshuffle** to start a new arrangement. Completing the circuit unlocks **Super Ball Adventure**, which embeds the Scratch game player.

## Publish the site

The `CNAME` file is set to `ThayerCreations.com`. Configure that domain's DNS for the GitHub Pages site and set the repository's Pages publishing source to the `ThayerCreations` folder (or deploy that folder's contents as the Pages root). Enable HTTPS in the repository's Pages settings after DNS verification.
