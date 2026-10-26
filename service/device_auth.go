package service

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/ovozoe/wxhb/config"
)

// DeviceAuthorize 转发网关设备授权发起请求，原样返回网关响应体。
func DeviceAuthorize() (map[string]any, error) {
	req, err := http.NewRequest(http.MethodPost, deviceAuthURL("/api/device/authorize"), bytes.NewReader([]byte("{}")))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return deviceAuthJSON(req)
}

// DeviceToken 转发网关设备授权轮询请求，原样返回网关响应体。
func DeviceToken(deviceCode string) (map[string]any, error) {
	values := url.Values{}
	values.Set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
	values.Set("device_code", deviceCode)
	values.Set("client_id", "device")
	req, err := http.NewRequest(http.MethodPost, deviceAuthURL("/api/device/token"), strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return deviceAuthJSON(req)
}

func deviceAuthURL(path string) string {
	return strings.TrimRight(config.Cfg.DeviceAuthGatewayBaseURL, "/") + path
}

func deviceAuthJSON(req *http.Request) (map[string]any, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, safeMessageError{message: "无法连接授权网关"}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, safeMessageError{message: "授权网关响应异常"}
	}
	return payload, nil
}
