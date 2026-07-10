-- Supabase Veritabanı Kurulum Betiği (Monopoly Deal)
-- Bu kodu Supabase Dashboard -> SQL Editor alanına yapıştırıp çalıştırın.

-- 1. users tablosunu oluşturun
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    coins INTEGER NOT NULL DEFAULT 500,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    avatar_id TEXT NOT NULL DEFAULT 'avatar_classic',
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    unlocked_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    friends JSONB NOT NULL DEFAULT '[]'::jsonb,
    achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_quests JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. admin_settings tablosunu oluşturun
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    turn_duration INTEGER NOT NULL DEFAULT 30,
    bot_delay INTEGER NOT NULL DEFAULT 1800,
    extra_time_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    unlimited_double_rent BOOLEAN NOT NULL DEFAULT FALSE,
    win_coins INTEGER NOT NULL DEFAULT 200,
    xp_level_rate INTEGER NOT NULL DEFAULT 500,
    win_sets_target INTEGER NOT NULL DEFAULT 3,
    auto_end_turn BOOLEAN NOT NULL DEFAULT FALSE,
    game_mode TEXT NOT NULL DEFAULT 'classic'
);

-- Varsayılan ayar satırını ekleyin
INSERT INTO public.admin_settings (id, turn_duration, bot_delay, extra_time_enabled, unlimited_double_rent, win_coins, xp_level_rate, win_sets_target, auto_end_turn, game_mode)
VALUES (1, 30, 1800, TRUE, FALSE, 200, 500, 3, FALSE, 'classic')
ON CONFLICT (id) DO NOTHING;

-- 3. RLS ve politikaları ayarlayın
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update settings" ON public.admin_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous insert settings" ON public.admin_settings FOR INSERT WITH CHECK (true);
