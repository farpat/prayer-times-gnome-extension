/**
 * Déclarations de types pour les modules GNOME Shell
 * Ces déclarations permettent à TypeScript de comprendre les imports GJS
 */

// Globals GJS
declare const console: {
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
};

declare class TextDecoder {
    constructor(encoding?: string);
    decode(input: Uint8Array): string;
}

declare module 'gi://GLib' {
    export const PRIORITY_DEFAULT: number;
    export const SOURCE_CONTINUE: boolean;
    export const SOURCE_REMOVE: boolean;
    export function timeout_add_seconds(priority: number, interval: number, callback: () => boolean): number;
    export function timeout_add(priority: number, interval: number, callback: () => boolean): number;
    export function source_remove(id: number): boolean;
}

declare module 'gi://GObject' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function registerClass<T extends abstract new (...args: any[]) => any>(
        target: T
    ): T;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function registerClass<T extends abstract new (...args: any[]) => any>(
        options: { GTypeName?: string },
        target: T
    ): T;
}

declare module 'gi://St' {
    import type Clutter from 'gi://Clutter';

    export class BoxLayout extends Clutter.Actor {
        constructor(params?: { style_class?: string; spacing?: number; x_expand?: boolean });
        add_child(child: Clutter.Actor): void;
    }

    export class Bin extends Clutter.Actor {
        constructor(params?: { style_class?: string; y_align?: number });
    }

    export class Label extends Clutter.Actor {
        constructor(params?: { text?: string; style_class?: string; y_align?: number; x_expand?: boolean });
        text: string;
    }

    export class Icon extends Clutter.Actor {
        constructor(params?: { icon_name?: string; gicon?: unknown; style_class?: string; fallback_icon_name?: string });
        gicon: unknown;
    }
}

declare module 'gi://Gio' {
    export interface Settings {
        get_string(key: string): string | null;
        set_string(key: string, value: string): void;
        get_int(key: string): number;
        set_int(key: string, value: number): void;
        get_boolean(key: string): boolean;
        set_boolean(key: string, value: boolean): void;
        connect(signal: string, callback: () => void): number;
        disconnect(id: number): void;
    }

    export interface Icon {}

    export function icon_new_for_string(str: string): Icon;
}

declare module 'gi://Soup?version=3.0' {
    export class Session {
        send_and_read_async(
            message: Message,
            priority: number,
            cancellable: null,
            callback: (session: Session, result: unknown) => void
        ): void;
        send_and_read_finish(result: unknown): { get_data(): Uint8Array };
    }

    export class Message {
        static new(method: string, url: string): Message | null;
    }
}

declare module 'gi://Clutter' {
    export class Actor {
        add_style_class_name(className: string): void;
        remove_style_class_name(className: string): void;
        add_child(child: Actor): void;
        remove_child(child: Actor): void;
    }

    export enum ActorAlign {
        CENTER = 3,
    }
}

declare module 'gi://Adw' {
    import type Gtk from 'gi://Gtk';

    export class PreferencesWindow extends Gtk.Window {
        add(page: PreferencesPage): void;
        connect(signal: string, callback: () => boolean): number;
    }

    export class PreferencesPage extends Gtk.Widget {
        constructor(params?: { title?: string; icon_name?: string });
        add(group: PreferencesGroup): void;
    }

    export class PreferencesGroup extends Gtk.Widget {
        constructor(params?: { title?: string; description?: string });
        add(row: Gtk.Widget): void;
    }

    export class PreferencesRow extends Gtk.Widget {
        set_child(child: Gtk.Widget): void;
    }

    export class ActionRow extends PreferencesRow {
        constructor(params?: { title?: string; subtitle?: string; activatable?: boolean });
        connect(signal: string, callback: () => void): number;
    }

    export class ComboRow extends ActionRow {
        constructor(params?: { title?: string; subtitle?: string; model?: Gtk.StringList });
        selected: number;
    }

    export class SwitchRow extends ActionRow {
        constructor(params?: { title?: string; subtitle?: string });
        active: boolean;
    }
}

declare module 'gi://Gtk' {
    export class Widget {
        visible: boolean;
        append(child: Widget): void;
        get_first_child(): Widget | null;
        remove(child: Widget): void;
    }

    export class Window extends Widget {}

    export class Box extends Widget {
        constructor(params?: {
            orientation?: Orientation;
            spacing?: number;
            margin_top?: number;
            margin_bottom?: number;
            margin_start?: number;
            margin_end?: number;
        });
    }

    export class Label extends Widget {
        constructor(params?: { label?: string; halign?: Align; hexpand?: boolean; css_classes?: string[] });
        label: string;
    }

    export class SearchEntry extends Widget {
        constructor(params?: { placeholder_text?: string; hexpand?: boolean });
        text: string;
        connect(signal: string, callback: () => void): number;
    }

    export class ListBox extends Widget {
        constructor(params?: { selection_mode?: SelectionMode; css_classes?: string[]; visible?: boolean });
    }

    export class StringList {
        append(str: string): void;
    }

    export enum Orientation {
        HORIZONTAL = 0,
        VERTICAL = 1,
    }

    export enum Align {
        START = 1,
        END = 2,
        CENTER = 3,
        FILL = 0,
    }

    export enum SelectionMode {
        NONE = 0,
        SINGLE = 1,
        BROWSE = 2,
        MULTIPLE = 3,
    }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
    export const panel: {
        addToStatusArea(id: string, indicator: unknown, position?: number): void;
    };
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
    import type St from 'gi://St';
    import type * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

    export class Button extends St.BoxLayout {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _init(...args: any[]): void;
        menu: PopupMenu.PopupMenu;
        add_child(child: St.BoxLayout): void;
        destroy(): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
    import type St from 'gi://St';

    export class PopupMenu {
        box: St.BoxLayout;
        addMenuItem(item: PopupBaseMenuItem): void;
        close(): void;
    }

    export class PopupBaseMenuItem extends St.BoxLayout {
        constructor(params?: { reactive?: boolean; can_focus?: boolean; style_class?: string });
        connect(signal: string, callback: () => void): number;
    }

    export class PopupMenuItem extends PopupBaseMenuItem {
        constructor(text: string, params?: { reactive?: boolean; style_class?: string });
        label: St.Label;
        add_child(child: St.BoxLayout): void;
        remove_child(child: St.Label): void;
        add_style_class_name(className: string): void;
        remove_style_class_name(className: string): void;
    }

    export class PopupSeparatorMenuItem extends PopupBaseMenuItem {}
}

declare module 'resource:///org/gnome/shell/extensions/extension.js' {
    import type Gio from 'gi://Gio';

    export class Extension {
        readonly uuid: string;
        readonly path: string;
        getSettings(): Gio.Settings;
        openPreferences(): void;
    }
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
    import type Gio from 'gi://Gio';
    import type Adw from 'gi://Adw';

    export class ExtensionPreferences {
        getSettings(): Gio.Settings;
        fillPreferencesWindow(window: Adw.PreferencesWindow): void;
    }
}
