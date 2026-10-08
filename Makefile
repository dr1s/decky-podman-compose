.PHONY: all build clean release versioned

PLUGIN_NAME := decky-podman-compose
RELEASE_DIR := releases
DIST_DIR := dist
VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo unknown)

all: release

build:
	npm run build

clean:
	rm -rf $(DIST_DIR)
	rm -rf .release-staging
	find py_modules -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME).zip
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME)-v*.zip

release: build
	mkdir -p $(RELEASE_DIR)
	rm -rf .release-staging
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME).zip
	mkdir -p .release-staging/$(PLUGIN_NAME)/py_modules .release-staging/$(PLUGIN_NAME)/dist
	cp main.py plugin.json package.json README.md LICENSE .release-staging/$(PLUGIN_NAME)/
	cp py_modules/*.py .release-staging/$(PLUGIN_NAME)/py_modules/
	cp $(DIST_DIR)/index.js .release-staging/$(PLUGIN_NAME)/dist/
	cd .release-staging && zip -r ../$(RELEASE_DIR)/$(PLUGIN_NAME).zip .
	rm -rf .release-staging
	@echo "Created $(RELEASE_DIR)/$(PLUGIN_NAME).zip"

versioned: release
	cp $(RELEASE_DIR)/$(PLUGIN_NAME).zip $(RELEASE_DIR)/$(PLUGIN_NAME)-v$(VERSION).zip
	@echo "Created $(RELEASE_DIR)/$(PLUGIN_NAME)-v$(VERSION).zip"
