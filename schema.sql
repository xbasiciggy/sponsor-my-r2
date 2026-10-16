CREATE TABLE IF NOT EXISTS applications (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')),
 company TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
 slot TEXT, panel TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
 price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','rejected')),
 logo_key TEXT, paid_at TEXT
);
CREATE TRIGGER IF NOT EXISTS no_overlap_insert BEFORE INSERT ON applications WHEN NEW.status != 'rejected'
BEGIN SELECT RAISE(ABORT,'placement_conflict') WHERE EXISTS (
 SELECT 1 FROM applications a WHERE a.status != 'rejected' AND a.panel=NEW.panel
 AND NEW.x < a.x+a.w AND NEW.x+NEW.w > a.x AND NEW.y<a.y+a.h AND NEW.y+NEW.h>a.y); END;
CREATE TRIGGER IF NOT EXISTS no_overlap_update BEFORE UPDATE ON applications WHEN NEW.status != 'rejected'
BEGIN SELECT RAISE(ABORT,'placement_conflict') WHERE EXISTS (
 SELECT 1 FROM applications a WHERE a.id != NEW.id AND a.status != 'rejected' AND a.panel=NEW.panel
 AND NEW.x<a.x+a.w AND NEW.x+NEW.w>a.x AND NEW.y<a.y+a.h AND NEW.y+NEW.h>a.y); END;
CREATE INDEX IF NOT EXISTS applications_status ON applications(status);
