-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
    enable_ai BOOLEAN DEFAULT true,
    enable_watch_party BOOLEAN DEFAULT true,
    allow_registration BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    active_announcement TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default row if not exists
INSERT INTO public.system_settings (id, enable_ai, enable_watch_party, allow_registration, maintenance_mode, active_announcement)
VALUES (1, true, true, true, false, '')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read settings (needed for feature flags on client)
CREATE POLICY "Everyone can read system settings"
ON public.system_settings FOR SELECT
USING (true);

-- Only admins can update settings
-- Note: This relies on the is_admin() function we created earlier, or we can use the service role key which bypasses RLS anyway.
-- For safety, we'll restrict it to admins if accessed via client, but our server actions use Service Role.
CREATE POLICY "Admins can update system settings"
ON public.system_settings FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
