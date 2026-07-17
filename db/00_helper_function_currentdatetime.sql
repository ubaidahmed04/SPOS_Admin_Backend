--------------------------------------------------------------------------------
-- OPTIONAL HELPER — only run this if your DB does not already have a
-- currentdatetime() function defined (schema.sql's v2 procedures call it
-- instead of SYSDATE directly). If your DB already has this function
-- (e.g. defined centrally for the whole schema), SKIP this file.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION currentdatetime RETURN DATE
AS
BEGIN
  RETURN SYSDATE;
END;
/
