-- Allow public read access to website_menus and published menu items
-- (needed for public site Header/Footer rendering)

CREATE POLICY "Public can read menus"
ON public.website_menus
FOR SELECT
USING (true);

CREATE POLICY "Public can read published menu items"
ON public.website_menu_items
FOR SELECT
USING (is_published = true);
