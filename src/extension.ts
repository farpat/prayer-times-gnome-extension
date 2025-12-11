/**
 * Main extension entry point
 * Loaded by GNOME Shell when the extension starts
 */

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { PrayerTimesIndicator } from './ui/indicator.js';

/**
 * Main extension class
 * Manages lifecycle: enable() on start, disable() on stop
 */
export default class PrayerTimesExtension extends Extension {
    private _indicator: InstanceType<typeof PrayerTimesIndicator> | null = null;

    /**
     * Called when extension is enabled
     * Creates indicator and adds it to panel
     */
    enable(): void {
        this._indicator = new PrayerTimesIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    /**
     * Called when extension is disabled
     * Destroys indicator and releases resources
     */
    disable(): void {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
