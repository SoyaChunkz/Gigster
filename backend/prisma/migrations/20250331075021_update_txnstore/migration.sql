-- CreateTable
CREATE TABLE "TxnStore" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER,
    "signature" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TxnStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TxnStore_task_id_key" ON "TxnStore"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "TxnStore_signature_key" ON "TxnStore"("signature");

-- AddForeignKey
ALTER TABLE "TxnStore" ADD CONSTRAINT "TxnStore_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TxnStore" ADD CONSTRAINT "TxnStore_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
