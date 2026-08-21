# World Manager v1.2

A Pterodactyl Panel addon that adds a "Worlds" tab to the server page for Minecraft servers.
Manage, download, upload, rename, delete, and configure Minecraft worlds directly from the panel.

## Theme & Framework Compatibility

- **StandAlone (Standard Pterodactyl):** Fully supported out of the box (v1.11.x – v1.12.x+). Also compatible with other themes like Nebula.
- **Blueprint Framework & Nova Theme:** Fully supported. The installer automatically detects if the panel is running a Blueprint-based theme (such as Nova) and copies the adapted components.

---

## Installation / Upgrade

The setup script automatically detects if you are using a **StandAlone** standard theme or a **Blueprint** theme like Nova, copies the correct component files, and injects the routing configuration.

### First-Time Installation

1. Copy the `WorldManager` directory to your Pterodactyl directory (usually `/var/www/pterodactyl`):
   ```bash
   cp -r WorldManager /var/www/pterodactyl/
   ```
2. Navigate to the directory and run the installer:
   ```bash
   cd /var/www/pterodactyl/WorldManager
   bash setup.sh
   ```
3. Select option **1** to install. The script will automatically detect the setup (StandAlone or Blueprint) and build the production assets.

### Upgrading from a Broken/Previous Installation

If you had a failed install or need to upgrade to apply the Nova compatibility:

1. Run the setup script to perform a clean uninstall and restore original routing files:
   ```bash
   cd /var/www/pterodactyl/WorldManager
   bash setup.sh
   ```
2. Select option **2** to uninstall. This cleans up the files and reverts route changes.
3. Replace the `WorldManager/` folder with the updated files.
4. Run the installer again:
   ```bash
   bash setup.sh
   ```
5. Select option **1** to install.

---

## Features

- List all Minecraft worlds (auto-detects `level.dat`)
- Download worlds as compressed archives
- Upload & replace worlds via `.zip`
- Rename world folders
- Edit `server.properties` (seed, level-type, difficulty, etc.)
- Modify gamerules via console commands
- Regenerate worlds (delete + restart)
- Delete worlds

---

Made with ❤️ by isthisvishal

