import type { components } from "@/lib/api-types";

export type OrderStatus = components["schemas"]["OrderDto"]["status"];
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export type InventoryStockStatus = "OK" | "Warning" | "Reorder";
export type TeamMembershipStatus =
  components["schemas"]["TeamMemberListItemDto"]["status"];

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-warning/15 text-warning-foreground border-warning/30",
  CONFIRMED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
  FULFILLED: "bg-primary/15 text-primary border-primary/30",
  REFUNDED: "bg-muted text-muted-foreground border-muted",
};

export const ORDER_STATUS_TEXT_STYLES: Record<OrderStatus, string> = {
  PENDING: "text-warning-foreground",
  CONFIRMED: "text-success",
  CANCELLED: "text-destructive",
  FULFILLED: "text-primary",
  REFUNDED: "text-muted-foreground",
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

export const INVENTORY_STATUS_STYLES: Record<InventoryStockStatus, string> = {
  OK: "bg-success/15 text-success border-success/30",
  Warning: "bg-warning/15 text-warning-foreground border-warning/30",
  Reorder: "bg-destructive/15 text-destructive border-destructive/30",
};

export const TEAM_MEMBERSHIP_STATUS_STYLES: Record<
  TeamMembershipStatus,
  string
> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INVITED: "bg-amber-100 text-amber-700 border-amber-200",
  DEACTIVATED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function getInventoryStockStatus(
  quantity: number,
  lowStockThreshold: number,
): InventoryStockStatus {
  if (quantity === 0) {
    return "Reorder";
  }

  if (quantity <= lowStockThreshold) {
    return "Warning";
  }

  return "OK";
}
