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

Run the setup SQL again on an existing database to apply schema updates; it removes the unused project category column and creates and seeds the links table.

The public key is intended for browser use. Row-level security lets anyone read published projects and links, but only users listed in `project_admins` can create, edit, publish, or delete posts and links. Draft posts are only visible to signed-in project admins.

## Write project posts

Open the site and choose **Admin sign in**. The project form supports a title, card summary, cover-image URL, formatted story, multiple optional gallery images, and optional downloadable-file links. Click **Add image link** once for each additional gallery image. Images and downloads are linked from their existing public hosts; this site does not upload or copy those files. Supply a direct, publicly reachable URL for each image or file.

Use the story toolbar for headings, bold and italic text, lists, quotes, links, and code blocks. The site sanitizes formatted content before saving and displaying it. Choose **Save draft** to save work without publishing it; drafts can be incomplete and remain visible only to signed-in project administrators. Choose **Publish project** to publish a new project or a draft, or **Save changes** to update a published project. Published project titles should be unique so their generated URL slugs do not conflict.

For cross-origin file links, the browser or file host may choose to display the file instead of downloading it. Configure the file host to send a download response if a forced download is required.

## Awesome Links

The **Awesome Links** page is a curated set of maker resources organized by type. Use the filter above the table to show one type at a time. Sign in with a project administrator account to add, edit, or delete links. Running `supabase-setup.sql` creates the links table and seeds it with starter resources; changes made on the site are saved in Supabase.

## Publish the site

The `CNAME` file is set to `ThayerCreations.com`. Configure that domain's DNS for the GitHub Pages site and set the repository's Pages publishing source to the `ThayerCreations` folder (or deploy that folder's contents as the Pages root). Enable HTTPS in the repository's Pages settings after DNS verification.
