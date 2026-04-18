CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p85754813_daily_planner_app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p85754813_daily_planner_app.users(id),
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'Общее',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  advance TEXT DEFAULT 'none',
  advance_time TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p85754813_daily_planner_app.users(id),
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  date TEXT DEFAULT '',
  repeat TEXT DEFAULT 'once',
  active BOOLEAN DEFAULT TRUE,
  icon TEXT DEFAULT 'Bell',
  advance TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON t_p85754813_daily_planner_app.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON t_p85754813_daily_planner_app.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON t_p85754813_daily_planner_app.sessions(user_id);
