import axios from "axios";

import { BYTEBROAD_GATEWAY_MODELS } from "@/lib/model-channel";
import { apiPost } from "@/services/api/request";
import { buildApiUrl } from "@/stores/use-config-store";

export type GatewayUser = {
    id: number;
    employee_id: string;
    name: string;
    tenant_id: number | null;
    tenant_name: string | null;
    role: string | null;
    permissions: string[];
};

export type DeviceAuthorizeResponse = {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
};

export type GatewaySession = {
    api_key: string;
    ai_gateway_base_url: string;
    user: GatewayUser;
};

export type DeviceTokenResult = GatewaySession | "pending" | "denied" | "expired" | "error";

type DeviceTokenResponse = {
    error?: string;
    api_key?: string;
    ai_gateway_base_url?: string;
    user?: GatewayUser;
};

export async function deviceAuthorize(): Promise<DeviceAuthorizeResponse> {
    return apiPost<DeviceAuthorizeResponse>("/api/device/authorize");
}

export async function pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult> {
    let data: DeviceTokenResponse;
    try {
        data = await apiPost<DeviceTokenResponse>("/api/device/token", { device_code: deviceCode });
    } catch {
        return "error";
    }
    if (data.api_key && data.ai_gateway_base_url && data.user) {
        return { api_key: data.api_key, ai_gateway_base_url: data.ai_gateway_base_url, user: data.user };
    }
    if (data.error === "authorization_pending") return "pending";
    if (data.error === "access_denied") return "denied";
    if (data.error === "expired_token") return "expired";
    return "error";
}

export async function fetchGatewayModels(baseUrl: string, apiKey: string): Promise<string[]> {
    try {
        const response = await axios.get<{ data?: Array<{ id?: string }> }>(buildApiUrl(baseUrl, "/models"), {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 15000,
        });
        const models = (response.data.data || [])
            .map((model) => model.id)
            .filter((id): id is string => Boolean(id))
            .sort((a, b) => a.localeCompare(b));
        return models.length ? models : [...BYTEBROAD_GATEWAY_MODELS];
    } catch {
        return [...BYTEBROAD_GATEWAY_MODELS];
    }
}
