import type { z } from "zod";

import type { BotAPI } from "#shared/model/bot/api";
import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import {
  KookHttpConfigSchema,
  KookWsConfigSchema,
} from "#shared/model/bot/schema/kook";
import type {
  KookConfig,
  KookHttpConfig,
  KookWsConfig,
} from "#shared/model/bot/schema/kook";
import { MilkyConfigSchema } from "#shared/model/bot/schema/milky";
import type { MilkyConfig } from "#shared/model/bot/schema/milky";
import { OneBotWSConfigSchema } from "#shared/model/bot/schema/onebot";
import type {
  OneBotConfig,
  OneBotWSConfig,
  OneBotWSReverseConfig,
} from "#shared/model/bot/schema/onebot";
import { PlatformType } from "#shared/model/bot/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/i18n";

export type BotFormValue = Partial<z.infer<typeof BotAPI.POST.request>>;

// 默认值取自 shared schema；partial() 保留 .default()，必填项给空串
const kookWsDefaults = (token: string): KookWsConfig =>
  ({
    ...KookWsConfigSchema.partial().parse({ protocol: "ws" }),
    protocol: "ws",
    token,
  }) as KookWsConfig;

const buildDefaultConfig = (
  type?: PlatformType,
): OneBotConfig | DiscordConfig | KookConfig | MilkyConfig | undefined => {
  if (type === PlatformType.Onebot) {
    return { path: "", protocol: "ws-reverse", selfId: "", token: "" };
  }
  if (type === PlatformType.Discord) {
    return { token: "" };
  }
  if (type === PlatformType.Kook) {
    return kookWsDefaults("");
  }
  if (type === PlatformType.Milky) {
    return {
      ...MilkyConfigSchema.partial().parse({}),
      token: "",
    } as MilkyConfig;
  }
  return undefined;
};

const buildWsConfig = (selfId: string, token: string): OneBotWSConfig =>
  ({
    ...OneBotWSConfigSchema.partial().parse({ protocol: "ws" }),
    endpoint: "",
    selfId,
    token,
  }) as OneBotWSConfig;

const buildWsReverseConfig = (
  selfId: string,
  token: string,
): OneBotWSReverseConfig => ({
  path: "",
  protocol: "ws-reverse",
  selfId,
  token,
});

const Field = ({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) => (
  <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
    <Label>
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
    {children}
  </div>
);

interface Retry {
  retryTimes: number;
  retryInterval: number;
  retryLazy: number;
}

const RetryFields = ({
  value,
  onChange,
}: {
  value: Retry;
  onChange: (patch: Partial<Retry>) => void;
}) =>
  (
    [
      [t("重试次数"), "retryTimes"],
      [t("重试间隔（毫秒）"), "retryInterval"],
      [t("重试延迟（毫秒）"), "retryLazy"],
    ] as const
  ).map(([label, key]) => (
    <Field key={key} label={label} required>
      <NumberInput
        onChange={(next) => {
          onChange({ [key]: next });
        }}
        value={value[key]}
      />
    </Field>
  ));

/** Bot 配置表单。受控组件。 */
export const BotForm = ({
  value,
  onChange,
  isEdit = false,
}: {
  value: BotFormValue;
  onChange: (next: BotFormValue) => void;
  isEdit?: boolean;
}) => {
  const onebot =
    value.platform === PlatformType.Onebot
      ? (value.config as OneBotConfig | undefined)
      : undefined;
  const discord =
    value.platform === PlatformType.Discord
      ? (value.config as DiscordConfig | undefined)
      : undefined;
  const kook =
    value.platform === PlatformType.Kook
      ? (value.config as KookConfig | undefined)
      : undefined;
  const milky =
    value.platform === PlatformType.Milky
      ? (value.config as MilkyConfig | undefined)
      : undefined;

  const setPlatform = (platform: PlatformType): void => {
    onChange({ ...value, config: buildDefaultConfig(platform), platform });
  };

  const setOnebot = (patch: Partial<OneBotConfig>): void => {
    onChange({ ...value, config: { ...onebot, ...patch } as OneBotConfig });
  };

  const setKook = (patch: Partial<KookConfig>): void => {
    onChange({ ...value, config: { ...kook, ...patch } as KookConfig });
  };

  const setMilky = (patch: Partial<MilkyConfig>): void => {
    onChange({ ...value, config: { ...milky, ...patch } as MilkyConfig });
  };

  const onProtocolChange = (protocol: "ws" | "ws-reverse"): void => {
    const selfId = onebot?.selfId ?? "";
    const token = onebot?.token ?? "";
    onChange({
      ...value,
      config:
        protocol === "ws"
          ? buildWsConfig(selfId, token)
          : buildWsReverseConfig(selfId, token),
    });
  };

  const onKookProtocolChange = (protocol: "ws" | "http"): void => {
    const token = kook?.token ?? "";
    const config: KookWsConfig | KookHttpConfig =
      protocol === "ws"
        ? kookWsDefaults(token)
        : ({
            ...KookHttpConfigSchema.partial().parse({ protocol: "http" }),
            token,
            verifyToken: "",
          } as KookHttpConfig);
    onChange({ ...value, config });
  };

  const wsReverse = onebot?.protocol === "ws-reverse" ? onebot : undefined;
  const ws = onebot?.protocol === "ws" ? onebot : undefined;
  const kookWs = kook?.protocol === "ws" ? kook : undefined;
  const kookHttp = kook?.protocol === "http" ? kook : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field full label={t("机器人名称")}>
          <Input
            maxLength={12}
            onChange={(e) => {
              onChange({ ...value, name: e.target.value });
            }}
            placeholder={t("请输入机器人名称")}
            value={value.name ?? ""}
          />
        </Field>

        <Field full label={t("适配器类型")} required>
          <Select
            disabled={isEdit}
            onValueChange={(v) => {
              setPlatform(v as PlatformType);
            }}
            value={value.platform ?? ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("请选择适配器类型")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PlatformType.Onebot}>OneBot</SelectItem>
              <SelectItem value={PlatformType.Discord}>Discord</SelectItem>
              <SelectItem value={PlatformType.Kook}>KOOK</SelectItem>
              <SelectItem value={PlatformType.Milky}>Milky (QQ)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {discord ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field full label="Token" required>
            <Input
              onChange={(e) => {
                onChange({ ...value, config: { token: e.target.value } });
              }}
              placeholder={t("请输入 Discord Bot Token")}
              value={discord.token}
            />
          </Field>
        </div>
      ) : null}

      {onebot ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Bot ID" required>
            <Input
              onChange={(e) => {
                setOnebot({ selfId: e.target.value });
              }}
              placeholder={t("请输入机器人的账号")}
              value={onebot.selfId}
            />
          </Field>
          <Field label="Token">
            <Input
              onChange={(e) => {
                setOnebot({ token: e.target.value });
              }}
              placeholder={t("发送信息时用于验证的字段")}
              value={onebot.token}
            />
          </Field>
          <Field full label={t("连接协议")} required>
            <Select
              onValueChange={(v) => {
                onProtocolChange(v as "ws" | "ws-reverse");
              }}
              value={onebot.protocol}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("请选择连接协议")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ws-reverse">
                  {t("WebSocket 反向连接")}
                </SelectItem>
                <SelectItem value="ws">{t("WebSocket 正向连接")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {wsReverse ? (
            <Field full label={t("路径")} required>
              <Input
                onChange={(e) => {
                  setOnebot({ path: e.target.value });
                }}
                placeholder={t("如 /onebot")}
                value={wsReverse.path}
              />
            </Field>
          ) : null}

          {ws ? (
            <>
              <Field full label={t("连接地址")} required>
                <Input
                  onChange={(e) => {
                    setOnebot({ endpoint: e.target.value });
                  }}
                  placeholder="ws://localhost:2333"
                  value={ws.endpoint}
                />
              </Field>
              <Field label={t("超时时间（毫秒）")} required>
                <NumberInput
                  onChange={(timeout) => {
                    setOnebot({ timeout });
                  }}
                  value={ws.timeout}
                />
              </Field>
              <RetryFields onChange={setOnebot} value={ws} />
            </>
          ) : null}
        </div>
      ) : null}

      {kook ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Token" required>
            <Input
              onChange={(e) => {
                setKook({ token: e.target.value });
              }}
              placeholder={t("机器人的用户令牌")}
              value={kook.token}
            />
          </Field>
          <Field label={t("连接协议")} required>
            <Select
              onValueChange={(v) => {
                onKookProtocolChange(v as "ws" | "http");
              }}
              value={kook.protocol}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("请选择连接协议")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ws">WebSocket</SelectItem>
                <SelectItem value="http">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {kookWs ? <RetryFields onChange={setKook} value={kookWs} /> : null}

          {kookHttp ? (
            <>
              <Field label={t("验证令牌")} required>
                <Input
                  onChange={(e) => {
                    setKook({ verifyToken: e.target.value });
                  }}
                  placeholder={t("Webhook 验证令牌")}
                  value={kookHttp.verifyToken}
                />
              </Field>
              <Field label={t("路径")} required>
                <Input
                  onChange={(e) => {
                    setKook({ path: e.target.value });
                  }}
                  placeholder={t("如 /kook")}
                  value={kookHttp.path}
                />
              </Field>
            </>
          ) : null}
        </div>
      ) : null}

      {milky ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field full label={t("连接地址")} required>
            <Input
              onChange={(e) => {
                setMilky({ endpoint: e.target.value });
              }}
              placeholder="http://127.0.0.1:3000"
              value={milky.endpoint}
            />
          </Field>
          <Field full label="Token">
            <Input
              onChange={(e) => {
                setMilky({ token: e.target.value });
              }}
              placeholder={t("API 访问令牌")}
              value={milky.token}
            />
          </Field>
          <RetryFields onChange={setMilky} value={milky} />
        </div>
      ) : null}
    </div>
  );
};
