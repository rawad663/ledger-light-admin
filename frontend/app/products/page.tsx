import { AppShell } from "@/components/app-shell";
import { ProductsPage } from "@/components/products/products-page";
import { createApi } from "@/lib/api";

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const { search, category } = await searchParams;
  const api = await createApi();
  const { data, error } = await api.GET("/products", {
    params: {
      query: { limit: 50, search, category },
    },
  });

  if (error) {
    console.error(error);
  }

  const products = data?.data ?? [];

  return (
    <AppShell>
      <ProductsPage
        products={products}
        total={data?.totalCount ?? 0}
        nextCursor={data?.nextCursor}
        categories={data?.categories ?? []}
        initialSearch={search ?? ""}
      />
    </AppShell>
  );
}
