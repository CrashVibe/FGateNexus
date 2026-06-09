import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordAPI } from "#shared/model/auth/api";
import { validatePasswordStrength } from "#shared/utils/password";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/common/settings-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { QrCode } from "@/components/ui/qr-code";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { AuthData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth";

const STRENGTH_LABELS = ["很弱", "弱", "一般", "强", "很强"];

const passwordFormSchema = PasswordAPI.POST.request.extend({
  confirmPassword: z.string().min(1, "请确认密码"),
});
type PasswordForm = z.infer<typeof passwordFormSchema>;

// 内容较多但均为展示逻辑，复杂度上限对此类页面过严。
// oxlint-disable-next-line eslint/complexity
export const SecurityContent = () => {
  const navigate = useNavigate();
  const authStatus = useAuthStore((s) => s.authStatus);
  const checkAuthStatus = useAuthStore((s) => s.checkAuthStatus);
  const logout = useAuthStore((s) => s.logout);

  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [twoFA, setTwoFA] = useState({ keyuri: "", secret: "" });
  const [otp, setOtp] = useState("");
  const [deletePwd, setDeletePwd] = useState("");

  useEffect(() => {
    void (async () => {
      await checkAuthStatus();
      setInitializing(false);
    })();
  }, [checkAuthStatus]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(
      passwordFormSchema.superRefine((data, ctx) => {
        if (authStatus.hasPassword && !data.currentPassword) {
          ctx.addIssue({
            code: "custom",
            message: "请输入当前密码",
            path: ["currentPassword"],
          });
        }
        if (data.newPassword !== data.confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: "两次输入的密码不一致",
            path: ["confirmPassword"],
          });
        }
      }),
    ),
  });

  const newPassword = watch("newPassword");
  const strength = newPassword ? validatePasswordStrength(newPassword) : null;
  const strengthScore = strength?.score ?? 0;

  const openPasswordForm = (): void => {
    reset({ confirmPassword: "", currentPassword: "", newPassword: "" });
    setShowPasswordForm(true);
  };

  const onSetPassword = handleSubmit(async (data) => {
    if (strength && !strength.isValid) {
      toast.error(strength.error ?? "密码强度不够");
      return;
    }
    try {
      setBusy(true);
      await AuthData.setPassword({
        currentPassword: data.currentPassword ?? undefined,
        newPassword: data.newPassword,
      });
      toast.success("密码设置成功，请重新登录");
      setShowPasswordForm(false);
      await logout();
      await navigate({ to: "/login" });
    } catch (error) {
      toast.error("密码设置失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  });

  const setup2FA = async (): Promise<void> => {
    try {
      setBusy(true);
      const data = await AuthData.setup2FA();
      if (data) {
        setTwoFA(data);
        setOtp("");
        setShow2FA(true);
      }
    } catch (error) {
      toast.error("2FA 设置失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const verify2FA = async (): Promise<void> => {
    try {
      setBusy(true);
      await AuthData.verify2FA(twoFA.secret, otp);
      toast.success("2FA 验证成功");
      setShow2FA(false);
      await checkAuthStatus();
    } catch (error) {
      toast.error("2FA 验证失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const remove2FA = async (): Promise<void> => {
    try {
      setBusy(true);
      await AuthData.remove2FA();
      toast.success("2FA 已删除");
      await checkAuthStatus();
    } catch (error) {
      toast.error("删除 2FA 失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deletePwd) {
      toast.error("请输入当前密码");
      return;
    }
    try {
      setBusy(true);
      await AuthData.deletePassword(deletePwd);
      toast.success("密码已删除");
      setShowDelete(false);
      setDeletePwd("");
      await checkAuthStatus();
    } catch (error) {
      toast.error("删除密码失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {initializing ? null : (
        <div
          className={`flex flex-col gap-8 transition-opacity ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <SettingsSection
            description="设置密码以保护你的 FGate 实例免受未授权访问"
            title="密码保护"
          >
            <SettingsRow
              badge={
                authStatus.hasPassword ? (
                  <Badge variant="success">已设置</Badge>
                ) : (
                  <Badge variant="warning">未设置</Badge>
                )
              }
              label="当前状态"
            >
              <div className="flex gap-2">
                <Button onClick={openPasswordForm} size="sm">
                  {authStatus.hasPassword ? "修改密码" : "设置密码"}
                </Button>
                {authStatus.hasPassword ? (
                  <Button
                    onClick={() => {
                      setDeletePwd("");
                      setShowDelete(true);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    删除密码
                  </Button>
                ) : null}
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            description="为你的账户添加额外的安全层，使用 TOTP 应用生成验证码"
            title="双重验证 (2FA)"
          >
            <SettingsRow
              badge={
                authStatus.has2FA ? (
                  <Badge variant="success">已启用</Badge>
                ) : (
                  <Badge variant="warning">未启用</Badge>
                )
              }
              label="当前状态"
            >
              <div className="flex gap-2">
                {!authStatus.has2FA && authStatus.hasPassword ? (
                  <Button
                    onClick={() => {
                      void setup2FA();
                    }}
                    size="sm"
                  >
                    启用 2FA
                  </Button>
                ) : null}
                {authStatus.has2FA ? (
                  <Button
                    onClick={() => {
                      void remove2FA();
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    禁用 2FA
                  </Button>
                ) : null}
              </div>
            </SettingsRow>
            {authStatus.hasPassword ? null : (
              <div className="pb-4">
                <Alert variant="info">
                  <AlertDescription>
                    需要先设置密码才能启用 2FA
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </SettingsSection>
        </div>
      )}

      {/* 密码设置 */}
      <Dialog onOpenChange={setShowPasswordForm} open={showPasswordForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置密码</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            id="password-form"
            onSubmit={(e) => {
              void onSetPassword(e);
            }}
          >
            {authStatus.hasPassword ? (
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">当前密码</Label>
                <Input
                  id="currentPassword"
                  placeholder="输入当前密码"
                  type="password"
                  {...register("currentPassword")}
                />
                {errors.currentPassword ? (
                  <p className="text-destructive text-sm">
                    {errors.currentPassword.message}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                placeholder="输入新密码（至少8位）"
                type="password"
                {...register("newPassword")}
              />
              {newPassword ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      密码强度：
                    </span>
                    <Badge variant="secondary">
                      {STRENGTH_LABELS[strengthScore] ?? ""}
                    </Badge>
                  </div>
                  <Progress value={(strengthScore / 4) * 100} />
                  {strength?.feedback?.suggestions?.length ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        建议：
                      </span>
                      {strength.feedback.suggestions.map((s) => (
                        <span className="text-muted-foreground text-xs" key={s}>
                          • {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {errors.newPassword ? (
                <p className="text-destructive text-sm">
                  {errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                placeholder="再次输入新密码"
                type="password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-destructive text-sm">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowPasswordForm(false);
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
            <Button form="password-form" type="submit">
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA 设置 */}
      <Dialog onOpenChange={setShow2FA} open={show2FA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置双重验证</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              使用你的 TOTP 应用（如 Google Authenticator、Authy
              等）扫描下方二维码：
            </p>
            {twoFA.keyuri ? (
              <div className="flex justify-center rounded-lg bg-white p-3">
                <QrCode size={200} value={twoFA.keyuri} />
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              或手动输入密钥：{twoFA.secret}
            </p>
            <div className="space-y-1.5">
              <Label>验证码</Label>
              <InputOTP maxLength={6} onChange={setOtp} value={otp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot index={i} key={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShow2FA(false);
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                void verify2FA();
              }}
            >
              验证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除密码 */}
      <Dialog onOpenChange={setShowDelete} open={showDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除密码</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>此操作会清除 2FA 设置！</AlertDescription>
            </Alert>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="deletePwd">当前密码</Label>
              <Input
                id="deletePwd"
                onChange={(e) => {
                  setDeletePwd(e.target.value);
                }}
                placeholder="输入当前密码以确认"
                type="password"
                value={deletePwd}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowDelete(false);
              }}
              type="button"
              variant="outline"
            >
              点戳了~
            </Button>
            <Button
              onClick={() => {
                void confirmDelete();
              }}
              variant="destructive"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
