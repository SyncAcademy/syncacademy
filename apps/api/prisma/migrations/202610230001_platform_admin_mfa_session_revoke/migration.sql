UPDATE "User"
SET "sessionVersion" = "sessionVersion" + 1
WHERE "platformAdmin" = true;
