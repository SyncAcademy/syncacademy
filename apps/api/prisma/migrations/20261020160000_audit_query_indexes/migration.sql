CREATE INDEX "AuditEvent_createdAt_id_idx" ON "AuditEvent"("createdAt", "id");
CREATE INDEX "SecurityEvent_createdAt_id_idx" ON "SecurityEvent"("createdAt", "id");
CREATE INDEX "SecurityEvent_category_createdAt_idx" ON "SecurityEvent"("category", "createdAt");
CREATE INDEX "SecurityEvent_severity_createdAt_idx" ON "SecurityEvent"("severity", "createdAt");
