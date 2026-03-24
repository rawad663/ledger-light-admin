import { AppShell } from "@/components/app-shell";
import { ProductsPage } from "@/components/products/products-page";
import { createApi } from "@/lib/api";

export default async function Products() {
  const api = await createApi();
  const { data, error } = await api.GET("/products");

  if (error) {
    console.error(error);
  }

  const products = data?.data ?? [];

  return (
    <AppShell>
      <ProductsPage
        products={products.map((p) => ({
          ...p,
          category: p.category ?? "-",
          stock: 12,
          inventory: "In Stock",
          price: p.priceCents / 100,
        }))}
      />
    </AppShell>
  );
}
