import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { PlatformType } from "#shared/model/bot/types";
import { CommandConfigSchema } from "#shared/model/server/schema/command";
import type { targetResponse } from "#shared/model/server/schema/target";
import { LoadingState } from "@/components/common/loading-state";
import { MultiSelectCombobox } from "@/components/common/multi-select-combobox";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { PageContent } from "@/components/layout/page-content";
import { ServerHeader } from "@/components/layout/server-header";
import { TargetConfigSheet } from "@/components/target/target-config-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerConfigForm } from "@/hooks/use-server-config-form";
import { BotData, BrowserData, CommandData } from "@/lib/api";
import { ONEBOT_ROLES } from "@/lib/permissions";
import { useBot } from "@/queries/bots";
import { useServer } from "@/queries/servers";

const TargetCommandDrawer = ({
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
        <Label>远程指令</Label>
        <Switch
          checked={cmd.enabled}
          onCheckedChange={(v) => {
            setCmd({ enabled: v });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>指令前缀</Label>
        <Input
          onChange={(e) => {
            setCmd({ prefix: e.target.value });
          }}
          placeholder="请输入指令前缀（可空）"
          value={cmd.prefix}
        />
      </div>
      {target.type === "group" ? (
        <div className="space-y-2">
          <Label>权限</Label>
          <p className="text-muted-foreground text-xs">
            权限相互独立，不存在继承关系
          </p>
          {platform ? null : (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>
                由于你没有选择 Bot 实例，无法提供权限建议，可手动输入
              </AlertDescription>
            </Alert>
          )}
          <MultiSelectCombobox
            creatable
            onChange={(permissions) => {
              setCmd({ permissions });
            }}
            options={roleOptions}
            placeholder="选择或输入权限"
            value={cmd.permissions}
          />
        </div>
      ) : null}
    </div>
  );
};

export const ServerCommandPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/command" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server } = useServer(serverId);
  const { data: bot } = useBot(server?.botId ?? null);
  const { data: browser } = useQuery({
    queryFn: async () => await BrowserData.get(),
    queryKey: ["browser-config"],
  });

  const { config, setConfig, targets, setTargets, status } =
    useServerConfigForm(
      serverId,
      (s) => s.commandConfig ?? CommandConfigSchema.parse({}),
      async (command, changedTargets) => {
        await CommandData.patch(serverId, {
          command,
          targets: changedTargets,
        });
      },
    );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <ServerHeader width="form" status={status} />
      <PageContent width="form">
        {config === null ? (
          <LoadingState />
        ) : (
          <div className="space-y-8">
            <SettingsSection title="基础设置">
              <SettingsRow
                description="将指令返回结果的颜色代码转换为图片后发送"
                label="图片渲染"
              >
                <Switch
                  checked={config.imageRender}
                  onCheckedChange={(v) => {
                    setConfig({ ...config, imageRender: v });
                  }}
                />
              </SettingsRow>
              {browser?.executablePath === null ? (
                <div className="pb-4">
                  <Alert variant="warning">
                    <TriangleAlert />
                    <AlertDescription>
                      <Button
                        className="h-auto p-0"
                        onClick={() => {
                          void navigate({ to: "/settings" });
                        }}
                        variant="link"
                      >
                        图片渲染功能需要配置浏览器路径才能使用（去配置）
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </SettingsSection>

            <SettingsSection
              description="针对不同目标单独配置远程指令权限"
              title="目标配置"
            >
              <SettingsBlock>
                <TargetConfigSheet
                  onSelectedChange={setSelectedId}
                  selectedId={selectedId}
                  serverId={serverId}
                  targets={targets}
                >
                  {(target) => (
                    <TargetCommandDrawer
                      botId={bot?.id}
                      onChange={(newConfig) => {
                        setTargets((prev) =>
                          prev.map((t) =>
                            t.id === target.id
                              ? { ...t, config: newConfig }
                              : t,
                          ),
                        );
                      }}
                      platform={bot?.platform}
                      target={target}
                    />
                  )}
                </TargetConfigSheet>
              </SettingsBlock>
            </SettingsSection>
          </div>
        )}
      </PageContent>
    </>
  );
};
