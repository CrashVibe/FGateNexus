import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { differenceWith, isEqual, pick } from "lodash-es";
import { TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PlatformType } from "#shared/model/bot/types";
import { CommandConfigSchema } from "#shared/model/server/schema/command";
import type { targetResponse } from "#shared/model/server/schema/target";
import { LoadingState } from "@/components/common/loading-state";
import {
  SettingsBlock,
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { ServerHeader } from "@/components/layout/server-header";
import { TargetConfigSheet } from "@/components/target/target-config-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { useRegisterPageState } from "@/hooks/use-page-state";
import { BotData, BrowserData, CommandData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useBot } from "@/queries/bots";
import { useServer } from "@/queries/servers";

const ONEBOT_ROLES = [
  { label: "群主", value: "owner" },
  { label: "管理员", value: "admin" },
  { label: "成员", value: "member" },
];

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
    queryFn: async () => BotData.getDiscordRoles(botId!, target.guildId!),
    queryKey: ["discord-roles", botId, target.guildId],
  });

  const roleOptions =
    platform === PlatformType.Onebot ? ONEBOT_ROLES : (discordRoles.data ?? []);

  const setCmd = (patch: Partial<typeof cmd>): void => {
    onChange({
      ...target.config,
      CommandConfigSchema: { ...cmd, ...patch },
    });
  };

  const togglePermission = (value: string): void => {
    setCmd({
      permissions: cmd.permissions.includes(value)
        ? cmd.permissions.filter((p) => p !== value)
        : [...cmd.permissions, value],
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
          {platform ? (
            roleOptions.map((role) => (
              <label
                className="flex items-center gap-2 text-sm"
                key={role.value}
              >
                <Checkbox
                  checked={cmd.permissions.includes(role.value)}
                  onCheckedChange={() => {
                    togglePermission(role.value);
                  }}
                />
                {role.label}
              </label>
            ))
          ) : (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>
                由于你没有选择 Bot 实例，无法提供权限提示
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}
    </div>
  );
};

// oxlint-disable-next-line eslint/complexity
export const ServerCommandPage = () => {
  const { id } = useParams({ from: "/dashboard/servers/$id/command" });
  const serverId = Number(id);
  const navigate = useNavigate();

  const { data: server, refetch } = useServer(serverId);
  const { data: bot } = useBot(server?.botId ?? null);
  const { data: browser } = useQuery({
    queryFn: async () => BrowserData.get(),
    queryKey: ["browser-config"],
  });

  const [config, setConfig] = useState(CommandConfigSchema.parse({}));
  const [targets, setTargets] = useState<targetResponse[]>([]);
  const [original, setOriginal] = useState<{
    config: typeof config;
    targets: targetResponse[];
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (server) {
      const nextConfig = server.commandConfig ?? CommandConfigSchema.parse({});
      setConfig(nextConfig);
      setTargets(server.targets);
      setOriginal({
        config: structuredClone(nextConfig),
        targets: structuredClone(server.targets),
      });
    }
  }, [server]);

  const isDirty = useMemo(
    () => original !== null && !isEqual({ config, targets }, original),
    [config, targets, original],
  );

  const handleSubmit = async (): Promise<void> => {
    if (!original) {
      return;
    }
    const changed = differenceWith(targets, original.targets, isEqual).map(
      (t) => pick(t, ["id", "config"]),
    );
    try {
      await CommandData.patch(serverId, { command: config, targets: changed });
      toast.success("配置已保存");
      setSelectedId(null);
      await refetch();
    } catch (error) {
      toast.error("保存配置失败", { description: errorMessage(error) });
    }
  };

  useRegisterPageState(
    isDirty,
    async () => handleSubmit(),
    () => {
      setConfig(
        structuredClone(original?.config ?? CommandConfigSchema.parse({})),
      );
      setTargets(structuredClone(original?.targets ?? []));
      setSelectedId(null);
    },
  );

  if (!original) {
    return (
      <>
        <ServerHeader />
        <div className="flex-1 overflow-y-auto p-6">
          <LoadingState />
        </div>
      </>
    );
  }

  return (
    <>
      <ServerHeader />
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8 lg:px-6">
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
                          void navigate({ to: "/settings/browser" });
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
        </div>
      </div>
    </>
  );
};
