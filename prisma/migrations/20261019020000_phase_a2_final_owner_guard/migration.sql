-- PREPARED - NOT JOINTLY APPROVED OR APPLIED.
-- Serialize owner-removing DML with the application business-row lock.
BEGIN;

CREATE FUNCTION "guardFinalBusinessOwner"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."role" <> 'OWNER' THEN
      RETURN OLD;
    END IF;
  ELSIF OLD."role" <> 'OWNER' OR
        (NEW."role" = 'OWNER' AND NEW."businessId" = OLD."businessId") THEN
    RETURN NEW;
  END IF;

  -- A parent business being deleted has no surviving owner invariant.
  PERFORM 1 FROM "Business" WHERE "id" = OLD."businessId" FOR UPDATE;
  IF FOUND AND (
    SELECT count(*) FROM "BusinessMember"
    WHERE "businessId" = OLD."businessId" AND "role" = 'OWNER'
  ) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the final business owner'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "BusinessMember_final_owner_guard"
BEFORE DELETE OR UPDATE ON "BusinessMember"
FOR EACH ROW EXECUTE FUNCTION "guardFinalBusinessOwner"();

COMMIT;
