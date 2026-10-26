export type CanvasAgentBridgeConnection = { endpoint: string; token: string };

export type CanvasAgentToolEvent = {
    requestId: string;
    name: string;
    arguments: Record<string, unknown>;
};

export function normalizeCanvasAgentEndpoint(endpoint: string) {
    try {
        const url = new URL(endpoint);
        if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
        return url.origin;
    } catch {
        throw new Error("本地 Agent 地址必须为 http://127.0.0.1:端口");
    }
}

export async function readCanvasAgentConfig(endpoint: string): Promise<{ url: string; hasToken: boolean }> {
    const url = normalizeCanvasAgentEndpoint(endpoint);
    let response: Response;
    try {
        response = await fetch(url + "/config", { signal: AbortSignal.timeout(5_000) });
    } catch {
        throw new Error("未连接到本地 Agent，请先启动服务，再使用插件自动连接");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "无法读取本地 Agent 状态");
    return result;
}

export function createCanvasAgentBridge(
    connection: CanvasAgentBridgeConnection,
    canvasId: string,
    tools: unknown[],
    handlers: {
        tool: (event: CanvasAgentToolEvent) => void;
        cancelTool: (requestId: string) => void;
        ready: () => void | Promise<void>;
        error: (error: Error) => void;
    },
) {
    const clientId = crypto.randomUUID();
    const endpoint = normalizeCanvasAgentEndpoint(connection.endpoint);
    const lifetime = new AbortController();

    const request = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
        const response = await fetch(endpoint + path, {
            method: "POST",
            headers: { "content-type": "application/json", "x-canvas-agent-token": connection.token },
            body: JSON.stringify({ clientId, ...body }),
            signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(30_000)]),
        });
        const value = await response.json();
        if (!response.ok && !(path === "/result" && response.status === 409)) throw new Error(value.error || value.msg || "本地 Agent 请求失败");
        return value as T;
    };

    const events = new EventSource(endpoint + "/events?" + new URLSearchParams({ clientId, token: connection.token }));
    const fail = (error: unknown) => {
        if (!lifetime.signal.aborted) handlers.error(error instanceof Error ? error : new Error("本地 Agent 连接已断开"));
    };
    const listen = <T>(name: string, listener: (value: T) => void) =>
        events.addEventListener(name, (event) => {
            try {
                listener(JSON.parse((event as MessageEvent).data) as T);
            } catch (error) {
                fail(error);
            }
        });
    listen<CanvasAgentToolEvent>("tool", (event) => handlers.tool(event));
    listen<{ requestId: string }>("tool-cancel", ({ requestId }) => handlers.cancelTool(requestId));
    events.onopen = () => {
        void request<{ serviceId: string }>("/connect", { canvasId, tools })
            .then(() => handlers.ready())
            .catch(fail);
    };
    events.onerror = () => fail(new Error("本地 Agent 连接已断开，请检查服务和连接配置"));

    return {
        result: (requestId: string, result?: unknown, error?: string) => request("/result", { requestId, result, error }),
        connected: () => events.readyState === EventSource.OPEN,
        signal: lifetime.signal,
        close: () => {
            events.close();
            lifetime.abort();
        },
    };
}