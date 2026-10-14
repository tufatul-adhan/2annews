CREATE TABLE "Rating" (
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("articleId", "userId"),
    CONSTRAINT "Rating_value_check" CHECK ("value" >= 1 AND "value" <= 5)
);

CREATE INDEX "Rating_articleId_value_idx" ON "Rating"("articleId", "value");

ALTER TABLE "Rating" ADD CONSTRAINT "Rating_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
