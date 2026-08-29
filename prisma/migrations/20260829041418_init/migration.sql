-- CreateEnum
CREATE TYPE "FacetId" AS ENUM ('humidity', 'lightweight', 'long_distance', 'cushioning', 'wet_grip', 'wide_feet', 'durability', 'sizing', 'returns', 'sustainability', 'local_availability', 'price_clarity');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "price_sgd" DECIMAL(10,2) NOT NULL,
    "is_ours" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_truths" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "facet" "FacetId" NOT NULL,
    "statement" TEXT NOT NULL,

    CONSTRAINT "product_truths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "max_price" DECIMAL(10,2),

    CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_weights" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "facet" "FacetId" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "query_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patches" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "facet" "FacetId",
    "sentence" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_is_ours_idx" ON "products"("is_ours");

-- CreateIndex
CREATE UNIQUE INDEX "product_truths_product_id_facet_key" ON "product_truths"("product_id", "facet");

-- CreateIndex
CREATE UNIQUE INDEX "query_weights_query_id_facet_key" ON "query_weights"("query_id", "facet");

-- CreateIndex
CREATE INDEX "patches_product_id_idx" ON "patches"("product_id");

-- AddForeignKey
ALTER TABLE "product_truths" ADD CONSTRAINT "product_truths_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_weights" ADD CONSTRAINT "query_weights_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patches" ADD CONSTRAINT "patches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
