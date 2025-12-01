-- Function to cleanup inactive parties
CREATE OR REPLACE FUNCTION cleanup_inactive_parties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete empty parties older than 1 hour
  DELETE FROM public.parties
  WHERE id IN (
    SELECT p.id
    FROM public.parties p
    LEFT JOIN public.party_members pm ON p.id = pm.party_id
    WHERE pm.id IS NULL -- No members
    AND p.created_at < (now() - interval '1 hour')
    AND p.status != 'finished'
  );

  -- Delete finished parties older than 24 hours
  DELETE FROM public.parties
  WHERE status = 'finished'
  AND creataed_at < (now() - interval '24 hours');
END;
$$;
