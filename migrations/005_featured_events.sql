-- Events can be pinned so they stay in the first four shown on the home page.
ALTER TABLE events ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_visible;
