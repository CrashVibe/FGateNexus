import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";

import { PlatformType } from "#shared/model/bot/types";
import type { targetResponse } from "#shared/model/server/schema/target";
import { MultiSelectCombobox } from "@/components/common/multi-select-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { t } from "@/i18n";
import { BotData } from "@/lib/api";
import { ONEBOT_ROLES } from "@/lib/permissions";

/** 单个群聊的远程指令：开关、前缀、权限 */
export const TargetCommandFields = ({
  target,
  platform,
  botId,
  onChange,
}: {
  target: targetResponse;
  platform: PlatformType | undefined;
  botId: number | undefined;
  onChange: (config: targetResponse["config"]) => void;
}) => {
  const cmd = target.config.CommandConfigSchema;

  const discordRoles = useQuery({
    enabled:
      platform === PlatformType.Discord &&
      botId !== undefined &&
      target.type === "group" &&
      target.guildId !== null,
    queryFn: async () => await BotData.getDiscordRoles(botId!, target.guildId!),
    queryKey: ["discord-roles", botId, target.guildId],
  });

  const kookRoles = useQuery({
    enabled:
      platform === PlatformType.Kook &&
      botId !== undefined &&
      target.type === "group" &&
      target.guildId !== null,
    queryFn: async () => await BotData.getKookRoles(botId!, target.guildId!),
    queryKey: ["kook-roles", botId, target.guildId],
  });

  const roleOptions = (() => {
    if (platform === PlatformType.Onebot || platform === PlatformType.Milky) {
      return ONEBOT_ROLES;
    }
    if (platform === PlatformType.Kook) {
      return kookRoles.data ?? [];
    }
    return discordRoles.data ?? [];
  })();

  const setCmd = (patch: Partial<typeof cmd>): void => {
    onChange({
      ...target.config,
      CommandConfigSchema: { ...cmd, ...patch },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>{t("远程指令")}</Label>
        <Switch
          checked={cmd.enabled}
          onCheckedChange={(v) => {
            setCmd({ enabled: v });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("指令前缀")}</Label>
        <Input
          onChange={(e) => {
            setCmd({ prefix: e.target.value });
          }}
          placeholder={t("请输入指令前缀（可空）")}
          value={cmd.prefix}
        />
      </div>
      {target.type === "group" ? (
        <div className="space-y-2">
          <Label>{t("权限")}</Label>
          <p className="text-muted-foreground text-xs">
            {t("权限相互独立，不存在继承关系")}
          </p>
          {platform ? null : (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>
                {t("由于你没有选择机器人，无法提供权限建议，可手动输入")}
              </AlertDescription>
            </Alert>
          )}
          <MultiSelectCombobox
            creatable
            onChange={(permissions) => {
              setCmd({ permissions });
            }}
            options={roleOptions}
            placeholder={t("选择或输入权限")}
            value={cmd.permissions}
          />
        </div>
      ) : null}
    </div>
  );
};
