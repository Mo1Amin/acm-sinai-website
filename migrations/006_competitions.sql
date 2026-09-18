-- Winners board: every competition keeps its own date and ranked winners.
CREATE TABLE IF NOT EXISTS competitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  category VARCHAR(80) NULL,
  held_on DATE NOT NULL,
  description VARCHAR(1000) NULL,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_held (is_visible, held_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS competition_winners (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  competition_id INT UNSIGNED NOT NULL,
  place SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  members VARCHAR(300) NULL,
  score VARCHAR(60) NULL,
  prize VARCHAR(120) NULL,
  photo VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comp (competition_id, place),
  CONSTRAINT fk_winner_comp FOREIGN KEY (competition_id) REFERENCES competitions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A short line about each person, shown in the profile card on the site.
ALTER TABLE people ADD COLUMN bio VARCHAR(300) NULL AFTER role;
