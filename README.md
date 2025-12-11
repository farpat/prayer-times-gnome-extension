# Prayer Times GNOME Extension

Extension GNOME Shell affichant les horaires de prière islamiques dans le panel supérieur.

## Fonctionnalités

- Affiche la prochaine prière dans le panel avec icône dédiée
- Menu déroulant avec les 5 prières du jour (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Auto-complétion pour la recherche de ville
- Support format 24h ou AM/PM
- Cache des horaires pour éviter les requêtes inutiles
- Plusieurs méthodes de calcul disponibles

## Prérequis

- GNOME Shell 45+
- Node.js 18+
- npm

## Installation

```bash
git clone https://github.com/farrugia/prayer-times-gnome-extension.git
cd prayer-times-gnome-extension
make install
make enable
```

Puis **déconnecte-toi et reconnecte-toi** pour voir l'extension.

## Commandes

```bash
make install    # Compile et installe l'extension
make enable     # Active l'extension
make disable    # Désactive l'extension
make uninstall  # Supprime l'extension
```

## Structure du projet

```
prayer-times-gnome-extension/
├── src/                    # Code source TypeScript
│   ├── extension.ts        # Point d'entrée principal
│   ├── prefs.ts            # Point d'entrée préférences
│   ├── ui/                 # Composants d'interface
│   │   ├── indicator.ts    # Indicateur du panel
│   │   ├── menu.ts         # Menu popup
│   │   └── prefs.ts        # Page de préférences
│   ├── helpers/            # Services et utilitaires
│   │   ├── api.ts          # Appels API (Aladhan, Open-Meteo)
│   │   ├── constants.ts    # Constantes
│   │   ├── icons.ts        # Gestion des icônes
│   │   ├── time.ts         # Utilitaires de temps
│   │   └── index.ts        # Réexports
│   └── types/              # Définitions de types
│       ├── index.ts        # Types métier
│       └── gnome.d.ts      # Types GNOME/GJS
├── icons/                  # Icônes SVG des prières
├── schemas/                # Schéma GSettings
├── dist/                   # Fichiers compilés (généré)
├── Makefile                # Commandes de build
├── tsconfig.json           # Configuration TypeScript
├── package.json            # Dépendances npm
├── metadata.json           # Métadonnées de l'extension
└── stylesheet.css          # Styles CSS
```

## APIs utilisées

- **Aladhan API** : Horaires de prière par ville
- **Open-Meteo Geocoding API** : Recherche de villes

## Développement

Après modification du code TypeScript :

```bash
make install
# Puis déconnexion/reconnexion
```

Voir les logs :

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Configuration

L'extension peut être configurée via :
- Le bouton Settings dans le menu
- `gnome-extensions prefs prayer-times@farrugia`

### Options disponibles

| Option | Description |
|--------|-------------|
| Ville | Ville pour le calcul des horaires |
| Méthode de calcul | Méthode islamique de calcul |
| Format 24h | Active le format 24h (sinon AM/PM) |

## Licence

MIT
