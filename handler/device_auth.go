package handler

import (
	"encoding/json"
	"net/http"

	"github.com/ovozoe/wxhb/service"
)

type deviceTokenRequest struct {
	DeviceCode string `json:"device_code"`
}

func DeviceAuthorize(w http.ResponseWriter, r *http.Request) {
	result, err := service.DeviceAuthorize()
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}

func DeviceToken(w http.ResponseWriter, r *http.Request) {
	var request deviceTokenRequest
	_ = json.NewDecoder(r.Body).Decode(&request)
	result, err := service.DeviceToken(request.DeviceCode)
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}
