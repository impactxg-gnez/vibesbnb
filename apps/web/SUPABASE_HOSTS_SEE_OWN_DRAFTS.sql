-- Hosts must be able to SELECT their own listings in any status (including draft).
-- Without this, Save & exit can insert a draft that never appears in My Properties.
-- Safe to re-run.

DROP POLICY IF EXISTS "Hosts can view their own properties" ON public.properties;
CREATE POLICY "Hosts can view their own properties"
  ON public.properties
  FOR SELECT
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can insert their own properties" ON public.properties;
CREATE POLICY "Hosts can insert their own properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can update their own properties" ON public.properties;
CREATE POLICY "Hosts can update their own properties"
  ON public.properties
  FOR UPDATE
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

SELECT 'Hosts can read and write their own draft listings.' AS status;
