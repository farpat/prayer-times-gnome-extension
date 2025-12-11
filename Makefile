UUID = prayer-times@farrugia
EXTENSION_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: install zip logs

install: ## Build and install extension locally
	@npm install --silent
	@npm run build --silent
	@mkdir -p $(EXTENSION_DIR)/schemas
	@mkdir -p $(EXTENSION_DIR)/icons
	@mkdir -p $(EXTENSION_DIR)/ui
	@mkdir -p $(EXTENSION_DIR)/helpers
	@mkdir -p $(EXTENSION_DIR)/types
	@cp dist/extension.js dist/prefs.js $(EXTENSION_DIR)/
	@cp dist/ui/*.js $(EXTENSION_DIR)/ui/
	@cp dist/helpers/*.js $(EXTENSION_DIR)/helpers/
	@cp dist/types/*.js $(EXTENSION_DIR)/types/ 2>/dev/null || true
	@cp metadata.json stylesheet.css $(EXTENSION_DIR)/
	@cp schemas/*.xml $(EXTENSION_DIR)/schemas/
	@cp icons/*.svg $(EXTENSION_DIR)/icons/
	@glib-compile-schemas $(EXTENSION_DIR)/schemas/
	@echo "Extension installed. Logout/login to reload JS changes."

zip: ## Create ZIP for extensions.gnome.org
	@npm install --silent
	@npm run build --silent
	@rm -rf build $(UUID).zip
	@mkdir -p build/$(UUID)/schemas
	@mkdir -p build/$(UUID)/icons
	@mkdir -p build/$(UUID)/ui
	@mkdir -p build/$(UUID)/helpers
	@mkdir -p build/$(UUID)/types
	@cp dist/extension.js dist/prefs.js build/$(UUID)/
	@cp dist/ui/*.js build/$(UUID)/ui/
	@cp dist/helpers/*.js build/$(UUID)/helpers/
	@cp dist/types/*.js build/$(UUID)/types/ 2>/dev/null || true
	@cp metadata.json stylesheet.css build/$(UUID)/
	@cp schemas/*.xml build/$(UUID)/schemas/
	@cp icons/*.svg build/$(UUID)/icons/
	@glib-compile-schemas build/$(UUID)/schemas/
	@cd build && zip -r ../$(UUID).zip $(UUID)
	@rm -rf build
	@echo ""
	@echo "$(UUID).zip created"
	@echo "  Upload: https://extensions.gnome.org/upload/"

logs: ## Watch extension logs in real-time
	journalctl -f -o cat --user -g "PrayerTimes|prayer-times"
