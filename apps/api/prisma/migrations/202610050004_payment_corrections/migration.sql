ALTER TABLE "Payment" ADD COLUMN "replacesId" UUID;
CREATE UNIQUE INDEX "Payment_replacesId_key" ON "Payment"("replacesId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
