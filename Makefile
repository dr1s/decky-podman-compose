.PHONY: all install build test clean release versioned vendor

PLUGIN_NAME := decky-podman-compose
RELEASE_DIR := releases
DIST_DIR := dist
VENDOR_DIR := .vendor-staging
VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo unknown)

all: release

install:
	npm install

build:
	npm run build

test:
	if [ -d ".venv" ] && [ -f ".venv/bin/python3" ]; then \
		.venv/bin/python3 -m pytest tests/ -v; \
	else \
		python3 -m pytest tests/ -v; \
	fi

clean:
	rm -rf $(DIST_DIR)
	rm -rf .release-staging
	rm -rf $(VENDOR_DIR)
	find py_modules -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME).zip
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME)-v*.zip

vendor:
	rm -rf $(VENDOR_DIR)
	mkdir -p $(VENDOR_DIR)
	pip3 install --target $(VENDOR_DIR) -r requirements.txt
	mkdir -p py_modules/vendor
	cp $(VENDOR_DIR)/podman_compose.py py_modules/vendor/
	cp -r $(VENDOR_DIR)/dotenv py_modules/vendor/
	find py_modules/vendor -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(VENDOR_DIR)

release: build vendor
	mkdir -p $(RELEASE_DIR)
	rm -rf .release-staging
	rm -f $(RELEASE_DIR)/$(PLUGIN_NAME).zip
	find py_modules -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	mkdir -p .release-staging/$(PLUGIN_NAME)/py_modules .release-staging/$(PLUGIN_NAME)/dist
	cp main.py plugin.json package.json README.md LICENSE .release-staging/$(PLUGIN_NAME)/
	cp -r py_modules/. .release-staging/$(PLUGIN_NAME)/py_modules/
	cp $(DIST_DIR)/index.js .release-staging/$(PLUGIN_NAME)/dist/
	cd .release-staging && zip -r ../$(RELEASE_DIR)/$(PLUGIN_NAME).zip .
	rm -rf .release-staging
	@echo "Created $(RELEASE_DIR)/$(PLUGIN_NAME).zip"

versioned: release
	cp $(RELEASE_DIR)/$(PLUGIN_NAME).zip $(RELEASE_DIR)/$(PLUGIN_NAME)-v$(VERSION).zip
	@echo "Created $(RELEASE_DIR)/$(PLUGIN_NAME)-v$(VERSION).zip"
