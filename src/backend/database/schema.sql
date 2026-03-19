CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Iron',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT,
  type TEXT NOT NULL CHECK(type IN ('short', 'long', 'ongoing')),
  publication_venue TEXT,
  deadline TEXT,
  working_hours_per_day REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
  phase TEXT NOT NULL DEFAULT 'planning',
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  outline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverable TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  difficulty TEXT NOT NULL DEFAULT 'Bronze' CHECK(difficulty IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond')),
  xp_reward INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'abandoned')),
  started_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  submission_text TEXT NOT NULL,
  grammar_score INTEGER NOT NULL DEFAULT 0,
  idea_score INTEGER NOT NULL DEFAULT 0,
  execution_score INTEGER NOT NULL DEFAULT 0,
  pace_multiplier REAL NOT NULL DEFAULT 1.0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  time_taken_minutes INTEGER NOT NULL DEFAULT 0,
  feedback_json TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
