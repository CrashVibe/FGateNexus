import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordAPI } from "#shared/model/auth/api";
import { validatePasswordStrength } from "#shared/utils/password";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import { t } from "@/i18n";
import { AuthData } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const STRENGTH_LABELS = [t("很弱"), t("弱"), t("一般"), t("强"), t("很强")];

const passwordFormSchema = PasswordAPI.POST.request.extend({
  confirmPassword: z.string().min(1, t("请确认密码")),
});
type PasswordForm = z.infer<typeof passwordFormSchema>;

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
  const [showRemove2FA, setShowRemove2FA] = useState(false);

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
            message: t("请输入当前密码"),
            path: ["currentPassword"],
          });
        }
        if (data.newPassword !== data.confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: t("两次输入的密码不一致"),
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
      toast.error(t(strength.error ?? "密码强度不够"));
      return;
    }
    try {
      setBusy(true);
      await AuthData.setPassword({
        currentPassword: data.currentPassword ?? undefined,
        newPassword: data.newPassword,
      });
      toast.success(t("密码设置成功，请重新登录"));
      setShowPasswordForm(false);
      await logout();
      await navigate({ to: "/login" });
    } catch (error) {
      toast.error(t("密码设置失败"), { description: errorMessage(error) });
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
      toast.error(t("2FA 设置失败"), { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const verify2FA = async (): Promise<void> => {
    try {
      setBusy(true);
      await AuthData.verify2FA(twoFA.secret, otp);
      toast.success(t("2FA 验证成功"));
      setShow2FA(false);
      await checkAuthStatus();
    } catch (error) {
      toast.error(t("2FA 验证失败"), { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const remove2FA = async (): Promise<void> => {
    try {
      await AuthData.remove2FA();
      toast.success(t("2FA 已删除"));
      await checkAuthStatus();
    } catch (error) {
      toast.error(t("删除 2FA 失败"), { description: errorMessage(error) });
      throw error;
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deletePwd) {
      toast.error(t("请输入当前密码"));
      return;
    }
    try {
      setBusy(true);
      await AuthData.deletePassword(deletePwd);
      toast.success(t("密码已删除"));
      setShowDelete(false);
      setDeletePwd("");
      await checkAuthStatus();
    } catch (error) {
      toast.error(t("删除密码失败"), { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const busyClass = cn(
    "transition-opacity",
    busy && "pointer-events-none opacity-50",
  );

  return (
    <>
      {initializing ? null : (
        <>
          <SettingsSection
            className={busyClass}
            description={t("设置密码以保护你的 FGate 实例免受未授权访问")}
            title={t("密码保护")}
          >
            <SettingsRow
              badge={
                authStatus.hasPassword ? (
                  <Badge variant="success">{t("已设置")}</Badge>
                ) : (
                  <Badge variant="warning">{t("未设置")}</Badge>
                )
              }
              label={t("当前状态")}
            >
              <div className="flex gap-2">
                <Button onClick={openPasswordForm} size="sm" variant="outline">
                  {authStatus.hasPassword ? t("修改密码") : t("设置密码")}
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
                    {t("删除密码")}
                  </Button>
                ) : null}
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            className={busyClass}
            description={t(
              "为你的账户添加额外的安全层，使用 TOTP 应用生成验证码",
            )}
            title={t("双重验证 (2FA)")}
          >
            <SettingsRow
              badge={
                authStatus.has2FA ? (
                  <Badge variant="success">{t("已启用")}</Badge>
                ) : (
                  <Badge variant="warning">{t("未启用")}</Badge>
                )
              }
              label={t("当前状态")}
            >
              <div className="flex gap-2">
                {!authStatus.has2FA && authStatus.hasPassword ? (
                  <Button
                    onClick={() => {
                      void setup2FA();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {t("启用 2FA")}
                  </Button>
                ) : null}
                {authStatus.has2FA ? (
                  <Button
                    onClick={() => {
                      setShowRemove2FA(true);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    {t("禁用 2FA")}
                  </Button>
                ) : null}
              </div>
            </SettingsRow>
            {authStatus.hasPassword ? null : (
              <div className="pb-4">
                <Alert variant="info">
                  <AlertDescription>
                    {t("需要先设置密码才能启用 2FA")}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </SettingsSection>
        </>
      )}

      {/* 密码设置 */}
      <Dialog onOpenChange={setShowPasswordForm} open={showPasswordForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("设置密码")}</DialogTitle>
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
                <Label htmlFor="currentPassword">{t("当前密码")}</Label>
                <Input
                  id="currentPassword"
                  placeholder={t("输入当前密码")}
                  type="password"
                  {...register("currentPassword")}
                />
                {errors.currentPassword ? (
                  <p className="text-destructive text-sm">
                    {t(errors.currentPassword.message ?? "")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t("新密码")}</Label>
              <Input
                id="newPassword"
                placeholder={t("输入新密码（至少8位）")}
                type="password"
                {...register("newPassword")}
              />
              {newPassword ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {t("密码强度：")}
                    </span>
                    <Badge variant="secondary">
                      {STRENGTH_LABELS[strengthScore] ?? ""}
                    </Badge>
                  </div>
                  <Progress value={(strengthScore / 4) * 100} />
                  {strength?.feedback?.suggestions?.length ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {t("建议：")}
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
                  {t(errors.newPassword.message ?? "")}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("确认密码")}</Label>
              <Input
                id="confirmPassword"
                placeholder={t("再次输入新密码")}
                type="password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-destructive text-sm">
                  {t(errors.confirmPassword.message ?? "")}
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
              {t("取消")}
            </Button>
            <Button form="password-form" loading={busy} type="submit">
              {t("确认")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA 设置 */}
      <Dialog onOpenChange={setShow2FA} open={show2FA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("设置双重验证")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {t(
                "使用你的 TOTP 应用（如 Google Authenticator、Authy 等）扫描下方二维码：",
              )}
            </p>
            {twoFA.keyuri ? (
              <div className="flex justify-center rounded-lg bg-white p-3">
                <QrCode size={200} value={twoFA.keyuri} />
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {t("或手动输入密钥：")}
              {twoFA.secret}
            </p>
            <div className="space-y-1.5">
              <Label>{t("验证码")}</Label>
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
              {t("取消")}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                void verify2FA();
              }}
            >
              {t("验证")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmText={t("禁用 2FA")}
        description={t("禁用之后就只剩密码守门了……真的要这样？")}
        onConfirm={remove2FA}
        onOpenChange={setShowRemove2FA}
        open={showRemove2FA}
        title={t("禁用 2FA")}
      />

      {/* 删除密码 */}
      <Dialog onOpenChange={setShowDelete} open={showDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("删除密码")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                {t("此操作会清除 2FA 设置！")}
              </AlertDescription>
            </Alert>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="deletePwd">{t("当前密码")}</Label>
              <Input
                id="deletePwd"
                onChange={(e) => {
                  setDeletePwd(e.target.value);
                }}
                placeholder={t("输入当前密码以确认")}
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
              {t("点戳了~")}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                void confirmDelete();
              }}
              variant="destructive"
            >
              {t("确认删除")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
