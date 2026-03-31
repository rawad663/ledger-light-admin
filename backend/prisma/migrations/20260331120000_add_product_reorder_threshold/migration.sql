-- Add per-product reorder thresholds to support live low-stock dashboard views.
ALTER TABLE "Product"
ADD COLUMN "reorderThreshold" INTEGER NOT NULL DEFAULT 10;
