import { Link } from "@tanstack/react-router";

const tabs = [
  { label: "安全设置", to: "/settings/security" },
  { label: "浏览器设置", to: "/settings/browser" },
] as const;

/** 设置页子导航(对齐原 settings.vue 的工具栏导航)。 */
export const SettingsTabs = () => (
  <div className="flex gap-1 border-b px-4 lg:px-6">
    {tabs.map((tab) => (
      <Link
        activeProps={{
          className: "border-primary text-foreground",
        }}
        className="text-muted-foreground hover:text-foreground border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors"
        key={tab.to}
        to={tab.to}
      >
        {tab.label}
      </Link>
    ))}
  </div>
);
