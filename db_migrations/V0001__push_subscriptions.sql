CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_key TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]',
  reminders JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p85754813_daily_planner_app.push_fired (
  id SERIAL PRIMARY KEY,
  user_key TEXT NOT NULL,
  tag TEXT NOT NULL,
  fired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_key, tag)
);
