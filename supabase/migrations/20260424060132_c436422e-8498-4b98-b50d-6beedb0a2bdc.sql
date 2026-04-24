-- Reverse the false [Deleted Client] negative-cache rows written by the
-- prior on-demand fetch logic. These 231 rows were created when the
-- per-branch fan-out failed to find a client in the first branch tried,
-- and the loop terminated before exhaustively proving non-existence.
-- The corrected sync logic (region-aware iteration, no negative-cache write)
-- will re-resolve these IDs on the next sync.
DELETE FROM public.phorest_clients
WHERE name = '[Deleted Client]'
  AND notes LIKE 'Auto-flagged%';