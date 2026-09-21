package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeDockerSQLiteDSNUsesMountedDataDir(t *testing.T) {
	root := t.TempDir()
	appDataDir := filepath.Join(root, "data")
	if err := os.MkdirAll(appDataDir, 0755); err != nil {
		t.Fatal(err)
	}
	Cfg = Config{StorageDriver: "sqlite", DatabaseDSN: "data/bytebroad-canvas.db?_pragma=busy_timeout(5000)"}

	normalizeDockerSQLiteDSN(appDataDir)

	want := filepath.Join(root, "data", "bytebroad-canvas.db") + "?_pragma=busy_timeout(5000)"
	if Cfg.DatabaseDSN != want {
		t.Fatalf("DatabaseDSN = %q, want %q", Cfg.DatabaseDSN, want)
	}
}

func TestNormalizeDockerSQLiteDSNLeavesLocalPathWithoutMountedDataDir(t *testing.T) {
	Cfg = Config{StorageDriver: "sqlite", DatabaseDSN: "data/bytebroad-canvas.db"}

	normalizeDockerSQLiteDSN(filepath.Join(t.TempDir(), "missing-data"))

	if Cfg.DatabaseDSN != "data/bytebroad-canvas.db" {
		t.Fatalf("DatabaseDSN = %q, want relative local path", Cfg.DatabaseDSN)
	}
}
