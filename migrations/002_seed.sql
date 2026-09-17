-- Initial content, taken from the current su.acm.org and the launch posts.
SET NAMES utf8mb4;

INSERT INTO settings (`key`, `value`) VALUES
('site_title', 'Sinai University ACM Student Chapter'),
('hero_kicker', 'Sinai University ACM Student Chapter'),
('hero_line1', 'Build The'),
('hero_line2', 'Future'),
('hero_text', 'Join the world''s largest computing society. We empower students to create, innovate, and inspire through technology.'),
('about_text', 'The ACM Student Chapter at Sinai University is a community of tech-driven students who love learning, building, and innovating. Through specialized tracks, sessions with industry experts, competitions, and training opportunities, we help students develop real skills and reach their first job.'),
('registration_url', 'https://forms.gle/knhsT7v8busTjxRA8'),
('registration_open', '0'),
('whatsapp_url', 'https://chat.whatsapp.com/EOUWbocoFPbJfPQNHTEYoE'),
('contact_email', 'info@su.acm.org'),
('facebook_url', 'https://www.facebook.com/acm.sinai'),
('instagram_url', 'https://www.instagram.com/acm.sinai'),
('tiktok_url', 'https://www.tiktok.com/@acm.sinai'),
('linkedin_url', 'https://www.linkedin.com/company/acm-sinai'),
('analytics_retention_days', '365');

INSERT INTO tracks (slug, name, icon, short_desc, description, skills, roadmap, status, sort_order) VALUES
('problem-solving', 'Problem Solving', 'fa-code', 'C++, algorithms, and ICPC training.',
 'Sharpen your thinking with weekly problem sets and contests, and train for ICPC and technical interviews.',
 'C++ & STL\nData Structures\nAlgorithms & Dynamic Programming\nCodeforces & ICPC', 'C++ fundamentals and STL\nCore data structures\nGreedy, sorting and binary search\nGraphs and dynamic programming\nTeam contests and ICPC practice', 'soon', 1),
('web-development', 'Web Development', 'fa-globe', 'Front-end, back-end, and deployment.',
 'Build and ship real websites and web apps, from the first HTML page to a deployed full-stack project.',
 'HTML, CSS & JavaScript\nReact\nNode.js & REST APIs\nDatabases & Deployment', 'HTML, CSS and responsive design\nModern JavaScript\nReact\nBack-end with Node.js and databases\nDeploy a full-stack project', 'soon', 2),
('mobile-apps', 'Mobile Apps', 'fa-mobile-screen', 'Build and publish real apps.',
 'Design, build, and publish cross-platform mobile apps.',
 'Flutter & Dart\nUI & State Management\nFirebase & APIs\nPublishing Apps', 'Dart basics\nFlutter layouts and widgets\nState management\nAPIs and Firebase\nPublish to the stores', 'soon', 3),
('ai-data-science', 'AI & Data Science', 'fa-brain', 'Python, ML, and real datasets.',
 'Turn real data into insights and intelligent models.',
 'Python & Pandas\nMachine Learning\nDeep Learning\nData Visualization', 'Python for data\nData cleaning and visualization\nClassical machine learning\nDeep learning basics\nEnd-to-end ML project', 'soon', 4),
('cyber-security', 'Cyber Security', 'fa-shield-halved', 'Networks, Linux, and CTFs.',
 'Learn how systems are attacked so you can defend them, through labs and CTF challenges.',
 'Networking\nLinux & Tools\nWeb Security\nCTF Challenges', 'Networking fundamentals\nLinux and the command line\nWeb security (OWASP)\nCTF practice\nSecurity project', 'soon', 5),
('ui-ux-design', 'UI/UX Design', 'fa-pen-ruler', 'Research, Figma, and prototyping.',
 'Design products people enjoy using, from research to interactive prototypes.',
 'Design Principles\nFigma\nUser Research\nPrototyping', 'Design principles\nFigma essentials\nUser research\nWireframes and prototypes\nPortfolio case study', 'soon', 6),
('embedded-iot', 'Embedded & IoT', 'fa-microchip', 'Microcontrollers and sensors.',
 'Connect code to the physical world with microcontrollers, sensors, and IoT protocols.',
 'C for Microcontrollers\nArduino & ESP32\nSensors & Actuators\nIoT Protocols', 'C for embedded systems\nArduino basics\nSensors and actuators\nESP32 and connectivity\nIoT project', 'soon', 7),
('cloud-devops', 'Cloud & DevOps', 'fa-cloud', 'Docker, CI/CD, and the cloud.',
 'Run and scale systems in the cloud with modern DevOps practices.',
 'Linux & Networking\nDocker & Kubernetes\nAWS / Azure\nCI/CD Pipelines', 'Linux and networking\nDocker\nCloud fundamentals\nCI/CD pipelines\nDeploy a scalable service', 'soon', 8);

INSERT INTO events (title, description, starts_at, image) VALUES
('Intro to Cyber Security Session', 'Discover the fundamentals of cyber security and how to protect against online threats.', '2025-12-22 19:00:00', 'uploads/seed/events/intro-cyber-security.webp'),
('AI Generated Content Session', 'Learn how to leverage AI tools to create stunning content in seconds.', '2026-02-16 19:00:00', 'uploads/seed/events/ai-generated-content.webp'),
('Design Session', 'Master the principles of design and learn how to create visually stunning projects.', '2026-03-24 21:00:00', 'uploads/seed/events/design-journey.webp'),
('Web Development Career Session', 'Explore the world of web development and learn how to kickstart your career in this exciting field.', '2026-03-30 12:00:00', 'uploads/seed/events/web-development-career.webp'),
('Cloud Computing Session', 'Dive into the world of cloud computing and learn how to leverage cloud technologies for your projects.', '2026-04-23 20:00:00', 'uploads/seed/events/cloud-career.webp');

INSERT INTO albums (id, title, date_label, sort_order) VALUES
(1, 'Member Cards', '2025', 1),
(2, 'Sessions 2025 / 2026', 'Dec 2025 – Apr 2026', 2);

INSERT INTO photos (album_id, file, thumb, caption, sort_order) VALUES
(1, 'uploads/seed/gallery/acm-letters.webp', 'uploads/seed/gallery/acm-letters-thumb.webp', 'ACM spelled with our members'' cards', 1),
(1, 'uploads/seed/gallery/team-cards.webp', 'uploads/seed/gallery/team-cards-thumb.webp', 'The ACM Sinai team', 2),
(2, 'uploads/seed/gallery/intro-cyber-security.webp', 'uploads/seed/gallery/intro-cyber-security-thumb.webp', 'Intro to Cyber Security · Dec 2025', 1),
(2, 'uploads/seed/gallery/ai-generated-content.webp', 'uploads/seed/gallery/ai-generated-content-thumb.webp', 'AI Generated Content · Feb 2026', 2),
(2, 'uploads/seed/gallery/design-journey.webp', 'uploads/seed/gallery/design-journey-thumb.webp', 'Design Journey · Mar 2026', 3),
(2, 'uploads/seed/gallery/web-development-career.webp', 'uploads/seed/gallery/web-development-career-thumb.webp', 'Web Development Career · Mar 2026', 4),
(2, 'uploads/seed/gallery/cloud-career.webp', 'uploads/seed/gallery/cloud-career-thumb.webp', 'Navigate Your Cloud Career · Apr 2026', 5);

UPDATE albums SET cover_photo_id = (SELECT id FROM (SELECT id FROM photos WHERE album_id = 1 ORDER BY sort_order LIMIT 1) t) WHERE id = 1;
UPDATE albums SET cover_photo_id = (SELECT id FROM (SELECT id FROM photos WHERE album_id = 2 ORDER BY sort_order DESC LIMIT 1) t) WHERE id = 2;

INSERT INTO people (name, role, grp, photo, sort_order) VALUES
('Youseef Hani', 'Founder', 'founder', 'uploads/seed/team/youseef-hani.webp', 1),
('Mohamed Amin', 'Founder', 'founder', 'uploads/seed/team/mohamed-amin.webp', 2),
('Prof. Ahmed Sharaf Eldeen', 'Faculty Sponsor', 'sponsor', 'uploads/seed/team/ahmed-sharaf-eldeen.webp', 1),
('Roqia Waael', 'Secretary', 'board', NULL, 1),
('Eslam Abdelbaky', 'Treasurer', 'board', 'uploads/seed/team/eslam-abdelbaky.webp', 2),
('Ammar Enany', 'Head of HR', 'board', 'uploads/seed/team/ammar-enany.webp', 3),
('Abdelsabour Ashraf', 'Tech Team', 'board', 'uploads/seed/team/abdelsabour-ashraf.webp', 4),
('Mohamed Amein', 'Marketing', 'board', 'uploads/seed/team/mohamed-amein.webp', 5),
('Ahmed Gomaa', 'Media & Design', 'board', 'uploads/seed/team/ahmed-gomaa.webp', 6),
('Malak Ibrahim', 'PR', 'board', NULL, 7);
