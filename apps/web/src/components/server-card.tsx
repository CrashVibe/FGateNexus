import { useNavigate } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useRef, useState } from "react";

import type { ServerWithStatus } from "#shared/model/server/schema/servers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const SOFTWARE_ICONS: Record<string, string> = {
  Bukkit: "https://bukkit.org/favicon.ico",
  Canvas: "https://canvasmc.io/favicon.ico",
  Fabric: "https://fabricmc.net/assets/logo.png",
  Leaf: "https://www.leafmc.one/favicon.ico",
  Leaves: "https://leavesmc.org/favicon.ico",
  Paper: "https://assets.papermc.io/brand/papermc_logo.min.svg",
  Purpur: "https://purpurmc.org/favicon.ico",
  Spigot: "https://static.spigotmc.org/img/spigot.png",
  Velocity: "https://assets.papermc.io/brand/velocity_logo_blue.min.svg",
};

const getSoftwareIcon = (software: string | null): string =>
  (software && SOFTWARE_ICONS[software]) ?? "/minecraft.svg";

const getVersion = (original: string | null): string => {
  if (!original) {
    return "未知版本";
  }
  const match = /^([\d.]+-\d+-[a-f0-9]+)\s+\(MC:\s*([^)]+)\)/.exec(original);
  if (match) {
    return `v${match.at(2) ?? ""}`;
  }
  return original;
};

/** 服务器卡片：状态、版本、服务端、Token 复制。 */
export const ServerCard = ({ server }: { server: ServerWithStatus }) => {
  const navigate = useNavigate();
  const [showToken, setShowToken] = useState(false);
  const copying = useRef(false);

  const copyToken = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (copying.current) {
      toast.warning("我*，这么快干什么！");
      return;
    }
    copying.current = true;
    try {
      await navigator.clipboard.writeText(server.token);
      toast.success("Token 被剪贴板带跑啦，3 秒后消失~");
      setShowToken(true);
      setTimeout(() => {
        setShowToken(false);
        copying.current = false;
      }, 3000);
    } catch {
      toast.error("复制失败，小 clipboard 罢工了！");
      copying.current = false;
    }
  };

  return (
    <button
      aria-label={`查看服务器 #${server.id} 详情`}
      className={cn(
        "cursor-pointer text-left transition-all duration-300 ease-in-out hover:scale-[0.99] hover:opacity-80",
        !server.isOnline && "grayscale-[0.8]",
      )}
      onClick={() => {
        void navigate({
          params: { id: String(server.id) },
          to: "/servers/$id",
        });
      }}
      type="button"
    >
      <Card className="gap-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{server.name}</span>
            <Badge variant={server.isOnline ? "success" : "destructive"}>
              {server.isOnline ? "在线" : "离线"}
            </Badge>
          </div>
          <Badge variant={server.isOnline ? "secondary" : "warning"}>
            {getVersion(server.minecraft_version)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <img
            alt="server software icon"
            className="size-5 object-contain"
            src={getSoftwareIcon(server.minecraft_software)}
          />
          <span className="text-muted-foreground text-sm">
            {server.minecraft_software ?? "未知服务器端"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">Token:</span>
          <div className="flex gap-1">
            <Input
              className="flex-1"
              onClick={(e) => {
                void copyToken(e);
              }}
              readOnly
              value={showToken ? server.token : "•".repeat(16)}
            />
            <Button
              onClick={(e) => {
                void copyToken(e);
              }}
              size="icon"
              variant="secondary"
            >
              <Copy />
            </Button>
          </div>
        </div>

        <span className="text-muted-foreground text-right text-xs opacity-70 select-none">
          点击卡片查看更多信息
        </span>
      </Card>
    </button>
  );
};
