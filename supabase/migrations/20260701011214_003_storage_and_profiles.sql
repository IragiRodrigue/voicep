/*
# Storage Buckets & User Profiles

## Overview
- Create storage bucket for voice samples
- Add user profiles table for public user info
- Configure storage policies for authenticated users

## Tables

### user_profiles
- Public profile information for users
- Required for contact search by email

## Storage Buckets

### voice-samples
- Stores uploaded voice recordings
- Organized by user_id folder
- Only accessible by owner

*/

-- Create storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', false)
ON CONFLICT (id) DO NOTHING;

-- Create user_profiles table for public user info
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "select_all_profiles" ON user_profiles;
CREATE POLICY "select_all_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Updated_at trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for voice-samples bucket
DROP POLICY IF EXISTS "select_own_samples" ON storage.objects;
CREATE POLICY "select_own_samples" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "insert_own_samples" ON storage.objects;
CREATE POLICY "insert_own_samples" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "update_own_samples" ON storage.objects;
CREATE POLICY "update_own_samples" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_samples" ON storage.objects;
CREATE POLICY "delete_own_samples" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
