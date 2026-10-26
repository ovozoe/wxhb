package main

import (
	"log"

	"github.com/ovozoe/wxhb/config"
	"github.com/ovozoe/wxhb/handler"
	"github.com/ovozoe/wxhb/router"
	"github.com/ovozoe/wxhb/service"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	if err := service.EnsureDefaultAdmin(); err != nil {
		log.Fatal(err)
	}
	if err := service.EnsureDefaultAgentSkills(); err != nil {
		log.Fatal(err)
	}
	service.StartPromptSyncScheduler()
	service.StartCanvasProjectCleanupScheduler()
	handler.StartVideoTaskPoller()
	log.Fatal(router.New().Run(":" + config.Cfg.Port))
}
