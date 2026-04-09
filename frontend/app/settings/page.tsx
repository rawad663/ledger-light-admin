import { Settings } from "lucide-react";
import { CSSProperties } from "react";

import { AppShell } from "@/components/app-shell";
import { MockFeaturePage } from "@/components/mock/mock-feature-page";
import { settingsPageMock } from "@/lib/mocks/settings";

const style: CSSProperties = {
  position: "absolute",
  top: "40%",
  left: "50%",
  fontSize: 100,
  transform: "rotate(-45deg)",
  color: "red",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <h1 style={style}>MOCK</h1>
      <MockFeaturePage icon={Settings} data={settingsPageMock} />
    </AppShell>
  );
}
