-- Fix: get_next_counter never returned a value for new (per-day) counter ids.
-- The original UPDATE-only version stayed null when no row pre-existed,
-- which made the receipt/invoice number generator silently fall back to
-- browser localStorage — breaking persistence across devices and for the
-- new late-payment feature.
--
-- Upsert pattern: insert a new counter at 1, or bump the existing one.

CREATE OR REPLACE FUNCTION public.get_next_counter(counter_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    INSERT INTO public.counters (id, value)
    VALUES (counter_id, 1)
    ON CONFLICT (id) DO UPDATE SET value = public.counters.value + 1
    RETURNING value INTO next_val;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
