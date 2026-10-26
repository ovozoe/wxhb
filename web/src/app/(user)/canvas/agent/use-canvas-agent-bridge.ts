"use client";

import { useEffect, useRef, useState } from "react";

import {
    createCanvasAgentBridge,
    normalizeCanvasAgentEndpoint,
    readCanvasAgentConfig,
    type CanvasAgentBridgeConnection,
    type CanvasAgentToolEvent,
} from "@/services/api/canvas-agent-bridge";
import {
    CANVAS_AGENT_SKILL_FILE_TOOL,
    CANVAS_AGENT_TOOLS,
    normalizeCanvasAgentAction,
    type CanvasAgentAction,
    type CanvasAgentToolResult,
} from "./canvas-agent-tools";

type Client = ReturnType<typeof createCanvasAgentBridge>;

const CONNECTION_KEY = "canvas-agent-bridge-connection";
const defaultConnection = { endpoint: "http://127.0.0.1:3210", token: "" };
const agentTools = [...CANVAS_AGENT_TOOLS, CANVAS_AGENT_SKILL_FILE_TOOL].map(({ function: tool }) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters,
}));

export function useCanvasAgentBridge(options: {
    canvasId: string;
    executeTool: (action: CanvasAgentAction, signal: AbortSignal) => Promise<CanvasAgentToolResult>;
}) {
    const [connection, setConnection] = useState<CanvasAgentBridgeConnection>(defaultConnection);
    const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [enabled, setEnabled] = useState(true);
    const connectionAttempt = useRef(0);
    const client = useRef<Client | null>(null);
    const latest = useRef(options);
    latest.current = options;

    const disconnect = () => {
        connectionAttempt.current += 1;
        client.current?.close();
        client.current = null;
        setEnabled(false);
        setStatus("idle");
        setError("");
    };

    const connect = async (next: CanvasAgentBridgeConnection) => {
        disconnect();
        const attempt = connectionAttempt.current;
        setStatus("connecting");
        try {
            const value = { endpoint: normalizeCanvasAgentEndpoint(next.endpoint), token: next.token.trim() };
            if (!value.token) {
                await readCanvasAgentConfig(value.endpoint);
                throw new Error("已发现本地 Agent，请使用插件自动连接，或手动填写 Token");
            }
            try {
                localStorage.setItem(CONNECTION_KEY, JSON.stringify(value));
            } catch {
                // 仍允许当前页面连接
            }
            setConnection(value);
            setEnabled(true);
            setRetry((value) => value + 1);
            return true;
        } catch (reason) {
            if (connectionAttempt.current === attempt) {
                setError(reason instanceof Error ? reason.message : "连接本地 Agent 失败");
                setStatus("error");
            }
            return false;
        }
    };

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(CONNECTION_KEY) || "null");
            if (stored && typeof stored.endpoint === "string" && typeof stored.token === "string") setConnection(stored);
        } catch {
            // 本地配置不可用时使用默认值
        }
        const bootstrap = () => {
            const hash = window.location.hash.slice(1);
            const params = new URLSearchParams(hash);
            if (!params.has("agentUrl") && !params.has("agentToken")) return;
            const remaining = hash
                .split("&")
                .filter((part) => !["agentUrl", "agentToken"].includes(new URLSearchParams(part).keys().next().value || ""))
                .join("&");
            window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + (remaining ? "#" + remaining : ""));
            if (!params.get("agentUrl") || !params.get("agentToken")?.trim()) {
                disconnect();
                setError("自动连接链接缺少地址或 Token，请重新通过插件连接");
                setStatus("error");
                return;
            }
            void connect({ endpoint: params.get("agentUrl")!, token: params.get("agentToken")! });
        };
        bootstrap();
        window.addEventListener("hashchange", bootstrap);
        return () => {
            connectionAttempt.current += 1;
            window.removeEventListener("hashchange", bootstrap);
        };
    }, []);

    useEffect(() => {
        if (!enabled || !connection.token || !options.canvasId) return;
        try {
            normalizeCanvasAgentEndpoint(connection.endpoint);
        } catch (reason) {
            setError((reason as Error).message);
            setStatus("error");
            return;
        }
        setStatus("connecting");
        setError("");

        const toolControllers = new Map<string, AbortController>();
        let toolQueue = Promise.resolve();

        const fail = (reason: Error) => {
            if (client.current !== link) return;
            setError(reason.message);
            setStatus("error");
            toolControllers.forEach((controller) => controller.abort());
            client.current = null;
            link.close();
        };

        const handleTool = (event: CanvasAgentToolEvent) => {
            const controller = new AbortController();
            const signal = AbortSignal.any([link.signal, controller.signal]);
            toolControllers.set(event.requestId, controller);
            toolQueue = toolQueue
                .then(async () => {
                    try {
                        signal.throwIfAborted();
                        if (client.current !== link) throw new Error("本地 Agent 已断开");
                        const action = normalizeCanvasAgentAction(event.name, event.arguments, event.requestId);
                        const result = await latest.current.executeTool(action, signal);
                        signal.throwIfAborted();
                        await link.result(event.requestId, result);
                    } catch (reason) {
                        if (!signal.aborted) await link.result(event.requestId, undefined, reason instanceof Error ? reason.message : "画布工具执行失败");
                    } finally {
                        toolControllers.delete(event.requestId);
                    }
                })
                .catch(fail);
        };

        const link = createCanvasAgentBridge(connection, options.canvasId, agentTools, {
            tool: handleTool,
            cancelTool: (requestId) => toolControllers.get(requestId)?.abort(new Error("画布工具执行超时")),
            ready: async () => {
                if (client.current !== link || !link.connected()) return;
                setError("");
                setStatus("ready");
            },
            error: fail,
        });
        client.current = link;
        return () => {
            toolControllers.forEach((controller) => controller.abort());
            if (client.current === link) client.current = null;
            link.close();
        };
    }, [options.canvasId, connection.endpoint, connection.token, retry, enabled]);

    return { connection, connect, disconnect, status, error };
}