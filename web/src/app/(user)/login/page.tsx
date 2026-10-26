"use client";

import { LockOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Space, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { adminLogin } from "@/services/api/auth";
import { deviceAuthorize, fetchGatewayModels, pollDeviceToken, type GatewaySession } from "@/services/api/device-auth";
import { useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

type AdminFormValues = {
    username: string;
    password: string;
};

// 仅放行站内相对路径，拦截开放重定向。浏览器会忽略 URL 中的 Tab/换行/回车，并把
// //host 或 /\host 解析为协议相对的跨站地址，因此先剥离控制字符，再拒绝 // 与 /\ 前缀。
function safeRedirect(value: string | null): string {
    const cleaned = (value ?? "").replace(/[\t\n\r]/g, "");
    if (!cleaned.startsWith("/") || cleaned.startsWith("//") || cleaned.startsWith("/\\")) {
        return "/";
    }
    return cleaned;
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const { message } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const setGatewaySession = useUserStore((state) => state.setGatewaySession);
    const setAdminSession = useUserStore((state) => state.setAdminSession);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const redirect = safeRedirect(searchParams.get("redirect"));

    const [mode, setMode] = useState<"gateway" | "admin">("gateway");
    const [adminLoading, setAdminLoading] = useState(false);
    const [verificationUri, setVerificationUri] = useState("");
    const [status, setStatus] = useState<"loading" | "pending" | "denied" | "expired" | "error">("loading");
    const deviceCodeRef = useRef("");
    const intervalRef = useRef(5);
    const stoppedRef = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyGatewaySession = async (session: GatewaySession) => {
        setGatewaySession(session.api_key, session.ai_gateway_base_url, session.user);
        const models = await fetchGatewayModels(session.ai_gateway_base_url, session.api_key);
        updateConfig("channelMode", "local");
        updateConfig("baseUrl", session.ai_gateway_base_url);
        updateConfig("apiKey", session.api_key);
        updateConfig("models", models);
        updateConfig("localChannels", [
            {
                id: "gateway",
                protocol: "openai",
                name: "网关授权渠道",
                baseUrl: session.ai_gateway_base_url,
                apiKey: session.api_key,
                models,
            },
        ]);
        message.success("授权成功");
        router.replace(redirect);
        router.refresh();
    };

    const poll = async () => {
        const result = await pollDeviceToken(deviceCodeRef.current);
        if (stoppedRef.current) return;
        if (result === "pending") {
            pollTimerRef.current = setTimeout(poll, intervalRef.current * 1000);
            return;
        }
        if (result === "denied") {
            setStatus("denied");
            return;
        }
        if (result === "expired") {
            setStatus("expired");
            return;
        }
        if (result === "error") {
            setStatus("error");
            return;
        }
        await applyGatewaySession(result);
    };

    const startDeviceFlow = async () => {
        setStatus("loading");
        setVerificationUri("");
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        try {
            const auth = await deviceAuthorize();
            deviceCodeRef.current = auth.device_code;
            intervalRef.current = auth.interval || 5;
            setVerificationUri(auth.verification_uri);
            setStatus("pending");
            window.open(auth.verification_uri, "_blank", "noopener,noreferrer");
            pollTimerRef.current = setTimeout(poll, intervalRef.current * 1000);
        } catch {
            setStatus("error");
        }
    };

    useEffect(() => {
        stoppedRef.current = false;
        void startDeviceFlow();
        return () => {
            stoppedRef.current = true;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitAdmin = async (values: AdminFormValues) => {
        setAdminLoading(true);
        try {
            const session = await adminLogin({ username: values.username, password: values.password });
            setAdminSession(session.token, session.user);
            message.success("登录成功");
            router.replace(redirect);
            router.refresh();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "登录失败");
        } finally {
            setAdminLoading(false);
        }
    };

    return (
        <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-6 py-10 [background-size:16px_16px] dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)]">
            <section className="w-full max-w-[420px]">
                <div className="mb-7 text-center">
                    <span
                        className="mx-auto mb-4 block size-12 bg-stone-950 dark:bg-stone-100"
                        style={{
                            mask: "url(/logo.svg) center / contain no-repeat",
                            WebkitMask: "url(/logo.svg) center / contain no-repeat",
                        }}
                        aria-label="bytebroad剧造工厂"
                    />
                    <h1 className="text-3xl font-semibold tracking-normal text-stone-950 dark:text-stone-100">
                        {mode === "gateway" ? "网关授权登录" : "管理员登录"}
                    </h1>
                    <p className="mt-3 text-base leading-7 text-stone-500 dark:text-stone-400">
                        {mode === "gateway" ? "在浏览器中完成网关授权后即可使用画布。" : "使用本地管理员账号登录管理后台。"}
                    </p>
                </div>

                {mode === "gateway" ? (
                    <div className="text-center">
                        {status === "loading" ? (
                            <Typography.Text type="secondary">正在发起授权…</Typography.Text>
                        ) : status === "pending" ? (
                            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                                <Button block type="primary" href={verificationUri} target="_blank" rel="noreferrer">
                                    打开授权页面
                                </Button>
                                <Typography.Text type="secondary">完成授权后本页面会自动登录。</Typography.Text>
                            </Space>
                        ) : (
                            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                                <Typography.Text type="danger">
                                    {status === "denied" ? "授权已被拒绝。" : status === "expired" ? "授权已过期。" : "授权失败，请重试。"}
                                </Typography.Text>
                                <Button block type="primary" icon={<ReloadOutlined />} onClick={() => void startDeviceFlow()}>
                                    重新授权
                                </Button>
                            </Space>
                        )}
                    </div>
                ) : (
                    <Form<AdminFormValues> layout="vertical" size="large" requiredMark={false} onFinish={submitAdmin}>
                        <Form.Item name="username" label={<span className="font-medium text-stone-800 dark:text-stone-200">用户名</span>} rules={[{ required: true, message: "请输入用户名" }]}>
                            <Input prefix={<UserOutlined />} autoComplete="username" />
                        </Form.Item>
                        <Form.Item name="password" label={<span className="font-medium text-stone-800 dark:text-stone-200">密码</span>} rules={[{ required: true, message: "请输入密码" }]}>
                            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
                        </Form.Item>
                        <Button block type="primary" htmlType="submit" loading={adminLoading}>
                            登录
                        </Button>
                    </Form>
                )}

                <div className="mt-6 text-center">
                    <Button type="link" size="small" onClick={() => setMode(mode === "gateway" ? "admin" : "gateway")}>
                        {mode === "gateway" ? "管理员登录" : "返回网关授权登录"}
                    </Button>
                </div>
            </section>
        </main>
    );
}
