-- 002_length.sql
-- Adds length measurement to catches and migrates deprecated method values.

-- Length in centimetres (nullable — existing catches have no recorded length).
alter table catches
  add column length_cm numeric(5,1);

-- Methods "Feeder" and "Hand" are no longer offered in the picker —
-- collapse existing rows into "Other" so they remain valid.
update catches
  set method = 'Other'
  where method in ('Feeder', 'Hand');
