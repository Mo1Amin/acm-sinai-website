-- New board teaser: the founding board moves to the Advisory Board,
-- and the home page shows the new seats as "revealing soon" until the names are announced.
UPDATE people SET grp = 'advisor' WHERE grp = 'board';

INSERT IGNORE INTO settings (`key`, `value`) VALUES
('board_reveal', '1'),
('board_reveal_title', 'The new board is being chosen'),
('board_reveal_roles', 'Chair\nVice Chair\nSecretary\nTreasurer\nHead of HR\nTech Lead\nHead of Marketing\nMedia & Design'),
('board_reveal_date', '');
