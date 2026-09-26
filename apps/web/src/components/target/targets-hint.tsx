import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from "@/i18n";

/** 各功能页顶部：开关在「群聊连接」里统一管 */
export const TargetsHint = ({
  feature,
  serverId,
}: {
  feature: string;
  serverId: number;
}) => (
  <Alert className="[column-span:all]">
    <Info />
    <AlertDescription>
      <span>
        {t("哪些群要{{feature}}？", { feature })}
        <Link
          className="text-foreground mx-1 underline underline-offset-4"
          params={{ id: String(serverId) }}
          to="/servers/$id/target"
        >
          {t("去「群聊连接」里逐个打开")}
        </Link>
      </span>
    </AlertDescription>
  </Alert>
);
