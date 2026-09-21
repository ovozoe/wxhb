// 网关权威配置：单一 OpenAI 兼容直通网关
export const BYTEBROAD_GATEWAY_BASE_URL = "https://token.bytebroad.com.cn";

// 网关内可用模型列表（预填充配置下拉）
export const BYTEBROAD_GATEWAY_MODELS = [
    "bge-reranker-v2-m3",
    "deepseek-v3.2",
    "deepseek-v4-flash",
    "deepseek-v4-flash-0731",
    "deepseek-v4-flash-vision-exp",
    "deepseek-v4-pro",
    "deepseek-v4-pro-0813",
    "doubao-seed-2.0-code",
    "doubao-seed-2.0-lite",
    "doubao-seed-2.0-mini",
    "doubao-seed-2.0-pro",
    "doubao-seedance-2-0-260128",
    "doubao-seedance-2-0-fast-260128",
    "doubao-seedance-2-0-mini-260615",
    "doubao-seedance-2-5-260628",
    "doubao-seedream-5-0-260128",
    "happyhorse-1.0",
    "minimax/minimax-m2.5",
    "minimax/minimax-m2.5-highspeed",
    "minimax/minimax-m2.7",
    "minimax/minimax-m3",
    "moonshotai/kimi-k2.5",
    "moonshotai/kimi-k2.6",
    "moonshotai/kimi-k2.7-code",
    "moonshotai/kimi-k3",
    "qwen/qwen3-embedding-8b",
    "qwen/qwen3-reranker-8b",
    "qwen/qwen3.5-397b-a17b",
    "qwen/qwen3.5-flash",
    "qwen/qwen3.5-plus",
    "qwen/qwen3.6-flash",
    "qwen/qwen3.6-plus",
    "qwen/qwen3.7-max",
    "qwen/qwen3.7-plus",
    "qwen/qwen3.8-flash",
    "qwen/qwen3.8-max",
    "z-ai/glm-5",
    "z-ai/glm-5.1",
    "z-ai/glm-5.2",
    "z-ai/glm-5.3",
    "z-ai/glm-5.3-flash",
] as const;

// 协议类型保留完整联合，便于既有 provider 分支（image/video/audio 等按协议判断的逻辑）继续通过类型检查。
export type ModelChannelProtocol =
    | "openai"
    | "gemini"
    | "grok2api"
    | "metaso"
    | "apimart"
    | "88api"
    | "kie"
    | "autodl"
    | "ark"
    | "mimo";

// 前端直连上游的 provider 类型。协议裁剪后 directRequestProviders 为空，
// directAIProviderForProtocol 恒返回 null，直接请求路径不再触发，所有生成走服务端 openai 直通。
export type DirectAIProvider = "kie" | "apimart" | "autodl" | "ark";

// 仅启用 openai 直通网关，其余协议暂时注释掉。
export const modelChannelProtocols = [
    { value: "openai", label: "OpenAI", baseUrl: BYTEBROAD_GATEWAY_BASE_URL },
    // { value: "gemini", label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com" },
    // { value: "grok2api", label: "Grok2API", baseUrl: "" },
    // { value: "metaso", label: "MiniMax & METASO", baseUrl: "https://metaso.cn/api/minimax", apiKeyUrl: "https://metaso.cn/minimax-h3/?s=tt" },
    // { value: "apimart", label: "APIMart", baseUrl: "https://api.apimart.ai/v1", apiKeyUrl: "https://apimart.ai/register?aff=fWMrEv", directRequestPlan: true },
    // { value: "88api", label: "88API", baseUrl: "https://88api.ai/v1", apiKeyUrl: "https://88api.ai/sign-up?aff=25ty" },
    // { value: "kie", label: "KIE", baseUrl: "https://api.kie.ai/api/v1", directRequestPlan: true },
    // { value: "autodl", label: "AutoDL", baseUrl: "https://autodl.art", directRequestPlan: true },
    // { value: "ark", label: "火山方舟", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", directRequestPlan: true },
    // { value: "mimo", label: "MiMo", baseUrl: "https://api.xiaomimimo.com", apiKeyUrl: "https://platform.xiaomimimo.com/?ref=JFZQR2" },
] as const;

export const modelChannelProtocolOptions = modelChannelProtocols.map(({ value, label }) => ({ label, value }));
export const modelChannelDefaultBaseUrls = Object.fromEntries(modelChannelProtocols.map(({ value, baseUrl }) => [value, baseUrl])) as Record<ModelChannelProtocol, string>;
export const modelChannelApiKeyUrls = Object.fromEntries(modelChannelProtocols.flatMap((protocol) => "apiKeyUrl" in protocol ? [[protocol.value, protocol.apiKeyUrl]] : [])) as Partial<Record<ModelChannelProtocol, string>>;

const directRequestProviders: ReadonlySet<string> = new Set(modelChannelProtocols.flatMap((protocol) => "directRequestPlan" in protocol && protocol.directRequestPlan === true ? [protocol.value] : []));

export function directAIProviderForProtocol(protocol: string): DirectAIProvider | null {
    return directRequestProviders.has(protocol) ? protocol as DirectAIProvider : null;
}
