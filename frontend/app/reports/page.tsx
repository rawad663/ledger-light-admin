import { BarChart3 } from "lucide-react";
import { CSSProperties } from "react";

import { AppShell } from "@/components/app-shell";
import { MockFeaturePage } from "@/components/mock/mock-feature-page";
import { reportsPageMock } from "@/lib/mocks/reports";

const style: CSSProperties = {
  position: "absolute",
  top: "40%",
  left: "50%",
  fontSize: 100,
  transform: "rotate(-45deg)",
  color: "red",
};

export default function Reports() {
  return (
    <AppShell>
      <h1 style={style}>MOCK</h1>
      <MockFeaturePage icon={BarChart3} data={reportsPageMock} />
    </AppShell>
  );
}
