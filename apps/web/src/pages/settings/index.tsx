import { Globe, Shield } from "lucide-react";
import { useState } from "react";

import type { SubNavItem } from "@/components/common/settings-section";
import { SubPageLayout } from "@/components/common/settings-section";
import { BrowserContent } from "@/pages/settings/browser";
import { SecurityContent } from "@/pages/settings/security";

const NAV_ITEMS: SubNavItem[] = [
  {
    description: "密码、双重验证",
    icon: Shield,
    label: "安全设置",
    value: "security",
  },
  {
    description: "Chromium 路径配置",
    icon: Globe,
    label: "浏览器设置",
    value: "browser",
  },
];

export const SettingsPage = () => {
  const [section, setSection] = useState("security");

  return (
    <SubPageLayout
      items={NAV_ITEMS}
      onChange={setSection}
      title="设置"
      value={section}
    >
      {section === "security" && <SecurityContent />}
      {section === "browser" && <BrowserContent />}
    </SubPageLayout>
  );
};
