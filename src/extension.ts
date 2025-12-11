/**
 * Point d'entrée principal de l'extension
 * Fichier chargé par GNOME Shell au démarrage de l'extension
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { PrayerTimesIndicator } from './ui/indicator.js';

/**
 * Classe principale de l'extension
 * Gère le cycle de vie : enable() au démarrage, disable() à l'arrêt
 */
export default class PrayerTimesExtension extends Extension {
    private _indicator: InstanceType<typeof PrayerTimesIndicator> | null = null;

    /**
     * Appelé quand l'extension est activée
     * Crée l'indicateur et l'ajoute au panel
     */
    enable(): void {
        this._indicator = new PrayerTimesIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    /**
     * Appelé quand l'extension est désactivée
     * Détruit l'indicateur et libère les ressources
     */
    disable(): void {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
