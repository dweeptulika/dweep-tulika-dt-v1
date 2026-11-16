-- Add a mapping from Neon Auth identities to existing newsroom roles.
-- Existing UUID profile IDs remain unchanged for created_by/updated_by references.
ALTER TABLE public.editorial_profiles ADD COLUMN IF NOT EXISTS auth_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS editorial_profiles_auth_user_id_key
  ON public.editorial_profiles (auth_user_id) WHERE auth_user_id IS NOT NULL;
