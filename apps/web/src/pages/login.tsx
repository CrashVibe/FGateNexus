import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, LogIn, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { LoginAPI, PasswordAPI } from "#shared/model/auth/api";
import { ApiErrorType } from "#shared/model/error";
import { validatePasswordStrength } from "#shared/utils/password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { t } from "@/i18n";
import { AuthData } from "@/lib/api";
import { ApiRequestError, errorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth";

type LoginForm = z.infer<typeof LoginAPI.POST.request>;

const FAIL_MESSAGES = [
  t("……不对。重新来。"),
  t("错了，再试一次。不是因为我宽容，只是规则如此。"),
  t("验证失败。别以为我会手软。"),
];

const SUCCESS_MESSAGES = [
  t("验证通过。别误会，只是例行检查而已。"),
  t("身份确认完毕，可以进来了。"),
  t("……通过了。进来吧。"),
  t("识别成功。久等了。"),
  t("凭证有效。门已为你开着。"),
];

const pick = (list: string[]): string =>
  list[Math.floor(Math.random() * list.length)] ?? "";

const setupSchema = PasswordAPI.POST.request
  .pick({ newPassword: true })
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: t("两次输入的密码不一致"),
    path: ["confirmPassword"],
  });
type SetupForm = z.infer<typeof setupSchema>;

// 首次运行：还没有密码，先设一个再进门。
const SetupPasswordForm = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<SetupForm>({
    defaultValues: { confirmPassword: "", newPassword: "" },
    resolver: zodResolver(setupSchema),
  });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      toast.error(strength.error ?? t("密码强度不够"));
      return;
    }
    try {
      setIsLoading(true);
      await AuthData.setPassword({ newPassword });
      await login({ password: newPassword });
      toast.success(t("记住了。下次可别忘了。"));
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(t("密码设置失败"), { description: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        void onSubmit(e);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("新密码")}</Label>
        <Input
          autoComplete="new-password"
          disabled={isLoading}
          id="newPassword"
          placeholder={t("至少 8 位")}
          type="password"
          {...register("newPassword")}
        />
        {errors.newPassword ? (
          <p className="text-destructive text-sm">
            {t(errors.newPassword.message ?? "")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("确认密码")}</Label>
        <Input
          autoComplete="new-password"
          disabled={isLoading}
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-destructive text-sm">
            {t(errors.confirmPassword.message ?? "")}
          </p>
        ) : null}
      </div>
      <Button className="w-full" loading={isLoading} type="submit">
        <KeyRound />
        {t("设置密码并进入")}
      </Button>
    </form>
  );
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const has2FA = useAuthStore((s) => s.authStatus.has2FA);
  const hasPassword = useAuthStore((s) => s.authStatus.hasPassword);
  const login = useAuthStore((s) => s.login);
  const requireAuth = useAuthStore((s) => s.requireAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { password: "" },
    resolver: zodResolver(LoginAPI.POST.request),
  });

  useEffect(() => {
    void (async () => {
      if (!(await requireAuth())) {
        await navigate({ to: "/" });
      }
    })();
  }, [requireAuth, navigate]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      setIsLoading(true);
      await login(data);
      toast.success(pick(SUCCESS_MESSAGES));
      await navigate({ to: "/" });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.code === ApiErrorType.Unauthorized) {
          toast.error(pick(FAIL_MESSAGES));
          return;
        }
        toast.error(error.message);
        return;
      }
      toast.error(t("发生未知错误，请联系开发者～"));
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-11 items-center justify-center rounded-full">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl">
            {hasPassword ? t("登录验证") : t("初次见面")}
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? t("哼，你以为随便什么人都能进来吗……确认一下身份再说。")
              : t("门还没上锁呢……先设个密码，不然谁都能进来。")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void onSubmit(e);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="password">{t("密码")}</Label>
                <Input
                  autoComplete="current-password"
                  disabled={isLoading}
                  id="password"
                  placeholder={t("输入密码")}
                  type="password"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-destructive text-sm">
                    {t(errors.password.message ?? "")}
                  </p>
                ) : null}
              </div>

              {has2FA ? (
                <div className="space-y-2">
                  <Label>{t("双重验证码")}</Label>
                  <Controller
                    control={control}
                    name="twoFactorToken"
                    render={({ field }) => (
                      <InputOTP
                        disabled={isLoading}
                        maxLength={6}
                        onChange={(v) => {
                          // OTP 仅为 ASCII 数字，按码点拆分安全。
                          // oxlint-disable-next-line typescript/no-misused-spread
                          field.onChange(v ? [...v] : undefined);
                        }}
                        value={field.value?.join("") ?? ""}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot index={i} key={i} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    )}
                  />
                  {errors.twoFactorToken ? (
                    <p className="text-destructive text-sm">
                      {t(errors.twoFactorToken.message ?? "")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button className="w-full" loading={isLoading} type="submit">
                <LogIn />
                {t("登录")}
              </Button>
            </form>
          ) : (
            <SetupPasswordForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
