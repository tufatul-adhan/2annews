CREATE TABLE "ArticleImage" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "altText" TEXT NOT NULL,
    "credit" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleImage_articleId_key" ON "ArticleImage"("articleId");

ALTER TABLE "ArticleImage" ADD CONSTRAINT "ArticleImage_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
