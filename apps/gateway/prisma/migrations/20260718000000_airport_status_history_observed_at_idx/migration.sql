-- CreateIndex
CREATE INDEX "airport_status_history_observed_at_resolved_at_idx" ON "airport_status_history"("observed_at", "resolved_at");
