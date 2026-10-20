CREATE TABLE "MonitorSample" ("instance" TEXT NOT NULL, "at" TIMESTAMPTZ NOT NULL, "data" JSONB NOT NULL, PRIMARY KEY ("instance", "at"));
CREATE INDEX "MonitorSample_at_idx" ON "MonitorSample" ("at");
CREATE TABLE "MonitorEndpoint" ("instance" TEXT NOT NULL, "hour" TIMESTAMPTZ NOT NULL, "route" TEXT NOT NULL, "data" JSONB NOT NULL, PRIMARY KEY ("instance", "hour", "route"));
CREATE INDEX "MonitorEndpoint_hour_idx" ON "MonitorEndpoint" ("hour");
CREATE TABLE "MonitorSetting" ("id" INTEGER PRIMARY KEY DEFAULT 1, "data" JSONB NOT NULL);
CREATE TABLE "MonitorAlert" ("id" UUID PRIMARY KEY, "instance" TEXT NOT NULL, "service" TEXT NOT NULL, "severity" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMPTZ, "acknowledgedAt" TIMESTAMPTZ, "actorId" UUID);
CREATE UNIQUE INDEX "MonitorAlert_open_key" ON "MonitorAlert" ("instance", "service") WHERE "resolvedAt" IS NULL;
CREATE INDEX "MonitorAlert_detectedAt_idx" ON "MonitorAlert" ("detectedAt");
CREATE TABLE "MonitorWorker" ("instance" TEXT PRIMARY KEY, "at" TIMESTAMPTZ NOT NULL, "data" JSONB NOT NULL);
