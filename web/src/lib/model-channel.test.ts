import assert from "node:assert/strict";
import test from "node:test";
import { BYTEBROAD_GATEWAY_BASE_URL, BYTEBROAD_GATEWAY_MODELS, directAIProviderForProtocol, modelChannelApiKeyUrls, modelChannelDefaultBaseUrls, modelChannelProtocolOptions } from "./model-channel";

test("built-in protocol options retain both settings panels' labels and order", () => {
    assert.deepEqual(modelChannelProtocolOptions, [
        { label: "OpenAI", value: "openai" },
    ]);
});

test("built-in protocols retain all existing default URLs and API Key links", () => {
    assert.deepEqual(modelChannelDefaultBaseUrls, {
        openai: BYTEBROAD_GATEWAY_BASE_URL,
    });
    assert.deepEqual(modelChannelApiKeyUrls, {});
});

test("public parameter translation eligibility keeps exact protocol matching", () => {
    for (const protocol of ["openai", "gemini", "grok2api", "metaso", "mimo", "88api", "KIE", " kie ", "APIMart", "ARK", " ark ", "", "unknown"]) {
        assert.equal(directAIProviderForProtocol(protocol), null, protocol);
    }
});

test("gateway model list is pre-populated and non-empty", () => {
    assert.ok(BYTEBROAD_GATEWAY_MODELS.length >= 41);
    assert.ok(BYTEBROAD_GATEWAY_MODELS.includes("doubao-seedream-5-0-260128"));
    assert.ok(BYTEBROAD_GATEWAY_MODELS.includes("doubao-seedance-2-0-260128"));
    assert.ok(BYTEBROAD_GATEWAY_MODELS.includes("deepseek-v4-pro"));
});
