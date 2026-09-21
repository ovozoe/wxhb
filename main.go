package main

import (
	"log"

	"github.com/Yougahei/bytebroad-canvas/config"
	"github.com/Yougahei/bytebroad-canvas/handler"
	"github.com/Yougahei/bytebroad-canvas/router"
	"github.com/Yougahei/bytebroad-canvas/service"
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
