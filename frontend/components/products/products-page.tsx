"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Package,
  Check,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApiClient } from "@/hooks/use-api";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { CreateProductForm } from "@/components/products/create-product-form";
import { EditProductForm } from "@/components/products/edit-product-form";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";
import { toast } from "@/hooks/use-toast";

const inventoryColors: Record<string, string> = {
  "In Stock": "bg-success/15 text-success border-success/30",
  "Low Stock": "bg-warning/15 text-warning-foreground border-warning/30",
  "Out of Stock": "bg-destructive/15 text-destructive border-destructive/30",
};

import { type components } from "@/lib/api-types";
import { useUrlSearch } from "@/hooks/use-url-search";

export type Product = components["schemas"]["ProductDto"];
type ProductProp = Product & {
  stock: number;
  inventory: string;
  price: number;
};

export const PRODUCTS_PAGE_LIMIT = 50;

type Props = {
  products: Product[];
  total: number;
  nextCursor?: string;
  categories: string[];
  initialSearch: string;
};

function toProductProp(p: Product): ProductProp {
  return {
    ...p,
    category: p.category ?? "-",
    stock: 12,
    inventory: "In Stock",
    price: p.priceCents / 100,
  };
}

export function ProductsPage({
  products: initialProducts,
  total: initialTotal,
  nextCursor: initialNextCursor,
  categories,
  initialSearch,
}: Props) {
  const apiClient = useApiClient();
  const router = useRouter();
  const { searchParams, searchInput, setSearchInput, updateParams } =
    useUrlSearch(initialSearch);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";

  const [showEmpty, setShowEmpty] = React.useState(false);

  const {
    data: products,
    total,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
    showingFrom,
    showingTo,
    loading,
  } = useCursorPagination<Product>({
    initialData: initialProducts,
    initialTotal,
    initialNextCursor,
    limit: PRODUCTS_PAGE_LIMIT,
    filterKey: `${search}|${categoryFilter}`,
    fetchPage: React.useCallback(
      async (cursor?: string) => {
        const { data } = await apiClient.GET("/products", {
          params: {
            query: {
              limit: PRODUCTS_PAGE_LIMIT,
              cursor,
              search: search || undefined,
              category: categoryFilter === "all" ? undefined : categoryFilter,
            },
          },
        });
        return {
          data: data?.data ?? [],
          totalCount: data?.totalCount ?? 0,
          nextCursor: data?.nextCursor ?? undefined,
        };
      },
      [apiClient, search, categoryFilter],
    ),
  });

  const displayProducts = (showEmpty ? [] : products).map(toProductProp);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmpty(!showEmpty)}
          >
            {showEmpty ? "Show Products" : "Show Empty State"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 size-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(value) => updateParams({ category: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card">
        {displayProducts.length === 0 ? (
          <div className="py-16">
            <Empty
              icon={Package}
              title="No products found"
              description={
                showEmpty
                  ? "Get started by adding your first product to the catalog."
                  : "Try adjusting your search or filter criteria."
              }
            >
              {showEmpty ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Add Product
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    updateParams({ search: "", category: "" });
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProducts.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer group">
                    <TableCell className="font-medium">
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:text-primary"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.active ? (
                        <div className="flex justify-center">
                          <div className="flex size-5 items-center justify-center rounded-full bg-success/15">
                            <Check className="size-3 text-success" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="flex size-5 items-center justify-center rounded-full bg-muted">
                            <X className="size-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          inventoryColors[product.inventory],
                        )}
                      >
                        {product.inventory}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`}>
                              View details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const original = products.find(
                                (p) => p.id === product.id,
                              );
                              if (original) setEditProduct(original);
                            }}
                          >
                            Edit product
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setDeleteProduct({
                                id: product.id,
                                name: product.name,
                              })
                            }
                          >
                            Delete product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium">
                  {showingFrom}–{showingTo}
                </span>{" "}
                of <span className="font-medium">{total}</span> products
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPrevious || loading}
                  onClick={goPrevious}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNext || loading}
                  onClick={goNext}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateProductForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onSuccess={() => {
          toast({ title: "Product created" });
          router.refresh();
        }}
      />

      <EditProductForm
        open={!!editProduct}
        onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}
        product={editProduct}
        categories={categories}
        onSuccess={() => {
          toast({ title: "Product updated" });
          router.refresh();
        }}
      />

      <DeleteProductDialog
        open={!!deleteProduct}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
        product={deleteProduct}
        onSuccess={() => {
          toast({ title: "Product deleted" });
          router.refresh();
        }}
      />
    </div>
  );
}
