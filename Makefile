UUID = prayer-times@farrugia
EXTENSION_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: install update uninstall enable disable help

update: install ## Met à jour l'extension (alias de install)

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "make %-10s %s\n", $$1, $$2}'
	@echo ""
	@echo "Après install/enable, déconnecte-toi et reconnecte-toi."

install: ## Compile et installe l'extension
	@npm install --silent
	@npm run build --silent
	@mkdir -p $(EXTENSION_DIR)/{schemas,icons,ui,helpers,types}
	@cp dist/*.js $(EXTENSION_DIR)/
	@cp dist/ui/*.js $(EXTENSION_DIR)/ui/
	@cp dist/helpers/*.js $(EXTENSION_DIR)/helpers/
	@cp dist/types/*.js $(EXTENSION_DIR)/types/ 2>/dev/null || true
	@cp metadata.json stylesheet.css $(EXTENSION_DIR)/
	@cp schemas/*.xml $(EXTENSION_DIR)/schemas/
	@cp icons/*.svg $(EXTENSION_DIR)/icons/
	@glib-compile-schemas $(EXTENSION_DIR)/schemas/
	@echo "Extension installée. Lance 'make enable' puis déconnecte-toi."

uninstall: ## Supprime l'extension
	@rm -rf $(EXTENSION_DIR)
	@echo "Extension supprimée."

enable: ## Active l'extension
	@gnome-extensions enable $(UUID)
	@echo "Extension activée."

disable: ## Désactive l'extension
	@gnome-extensions disable $(UUID)
	@echo "Extension désactivée."
