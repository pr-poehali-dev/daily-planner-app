ALTER TABLE t_p85754813_daily_planner_app.push_subscriptions
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES t_p85754813_daily_planner_app.users(id);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON t_p85754813_daily_planner_app.push_subscriptions(user_id);
