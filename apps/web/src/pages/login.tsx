import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { LoginAPI } from "#shared/model/auth/api";
import { ApiErrorType } from "#shared/model/error";
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
import { ApiRequestError } from "@/lib/http";
import { useAuthStore } from "@/stores/auth";

type LoginForm = z.infer<typeof LoginAPI.POST.request>;

const FAIL_MESSAGES = [
  "……不对。重新来。",
  "错了，再试一次。不是因为我宽容，只是规则如此。",
  "验证失败。别以为我会手软。",
];

const SUCCESS_MESSAGES = [
  "验证通过。别误会，只是例行检查而已。",
  "身份确认完毕，可以进来了。",
  "……通过了。进来吧。",
  "识别成功。久等了。",
  "凭证有效。门已为你开着。",
];

const pick = (list: string[]): string =>
  list[Math.floor(Math.random() * list.length)] ?? "";

export const LoginPage = () => {
  const navigate = useNavigate();
  const has2FA = useAuthStore((s) => s.authStatus.has2FA);
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
      toast.error("发生未知错误，请联系开发者～");
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
          <CardTitle className="text-xl">登录验证</CardTitle>
          <CardDescription>
            哼，你以为随便什么人都能进来吗……确认一下身份再说。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              void onSubmit(e);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                autoComplete="current-password"
                disabled={isLoading}
                id="password"
                placeholder="输入密码"
                type="password"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-destructive text-sm">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {has2FA ? (
              <div className="space-y-2">
                <Label>双重验证码</Label>
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
                    {errors.twoFactorToken.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button className="w-full" disabled={isLoading} type="submit">
              <LogIn />
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
