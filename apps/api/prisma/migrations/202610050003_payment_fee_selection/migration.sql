ALTER TABLE "Payment" ADD COLUMN "chargeId" UUID;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "StudentCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Payment_chargeId_idx" ON "Payment"("chargeId");
