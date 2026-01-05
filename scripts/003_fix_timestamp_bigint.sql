-- Alter transcriptions table to use BIGINT for timestamp_ms to support millisecond timestamps
ALTER TABLE public.transcriptions
ALTER COLUMN timestamp_ms TYPE bigint;

-- Alter lectures table to use BIGINT for duration_ms to support large millisecond values
ALTER TABLE public.lectures
ALTER COLUMN duration_ms TYPE bigint;
