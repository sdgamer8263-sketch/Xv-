#!/bin/bash

echo "==============================================="
echo "  Pterodactyl World Manager Addon Setup v1.2"
echo "==============================================="
echo ""
echo "This script will inject the World Manager frontend into your Panel."
echo ""

ADDON_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ -f "artisan" ]; then
    PANEL_DIR="$(pwd)"
elif [ -f "../artisan" ]; then
    PANEL_DIR="$(cd .. && pwd)"
elif [ -f "/var/www/pterodactyl/artisan" ]; then
    PANEL_DIR="/var/www/pterodactyl"
else
    echo "Error: artisan file not found. Could not detect Pterodactyl installation."
    exit 1
fi

cd "$PANEL_DIR"

echo "Detected Pterodactyl installation at: $PANEL_DIR"
echo "1. Install World Manager Addon"
echo "2. Uninstall World Manager Addon"
read -p "Select an option [1-2]: " option

remove_block() {
    local file="$1"
    local start_marker="$2"
    local end_marker="$3"
    awk -v s="$start_marker" -v e="$end_marker" '
        !skip && index($0, s) { skip=1; next }
        skip && index($0, e) { skip=0; next }
        !skip
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

insert_after() {
    local file="$1"
    local pattern="$2"
    local insert_file="$3"
    awk -v pat="$pattern" -v ins="$insert_file" '
        BEGIN { done=0 }
        { print }
        !done && index($0, pat) {
            while ((getline line < ins) > 0) print line
            close(ins)
            done=1
        }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

insert_at_top() {
    local file="$1"
    local insert_file="$2"
    cat "$insert_file" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

if [ "$option" == "1" ]; then

    echo "[1/4] Copying Frontend Files..."
    mkdir -p resources/scripts/components/server/worldmanager

    # Detect panel variant
    PANEL_TYPE="standard"
    if [ -d "resources/scripts/components/novaStudio" ] || \
       grep -rq 'getnova.zip' resources/scripts/routers/ 2>/dev/null || \
       [ -f "resources/scripts/components/elements/dialog/Dialog.tsx" ]; then
        PANEL_TYPE="nova"
    fi

    if [ "$PANEL_TYPE" = "nova" ] && [ -d "$ADDON_DIR/Blueprint" ]; then
        echo "  Detected Nova theme — using Nova-compatible components"
        cp -r "$ADDON_DIR/Blueprint/resources/scripts/components/server/worldmanager/"* resources/scripts/components/server/worldmanager/
    else
        echo "  Using standard Pterodactyl components"
        cp -r "$ADDON_DIR/StandAlone/resources/scripts/components/server/worldmanager/"* resources/scripts/components/server/worldmanager/
    fi

    echo "[2/4] Injecting Route and Nav Tab..."

    ROUTES_FILE=""
    if [ -f "resources/scripts/routers/routes.ts" ]; then
        ROUTES_FILE="resources/scripts/routers/routes.ts"
        echo "  Found modern routes file: $ROUTES_FILE"
    elif [ -f "resources/scripts/routers/ServerRouter.tsx" ]; then
        ROUTES_FILE="resources/scripts/routers/ServerRouter.tsx"
        echo "  Found legacy router file: $ROUTES_FILE"
    else
        echo "ERROR: Could not find routing file (routes.ts or ServerRouter.tsx)."
        exit 1
    fi

    if grep -q "WORLD_MANAGER_IMPORT_START" "$ROUTES_FILE"; then
        remove_block "$ROUTES_FILE" "WORLD_MANAGER_IMPORT_START" "WORLD_MANAGER_IMPORT_END"
    fi

    IMPORT_TMP=$(mktemp)
    cat > "$IMPORT_TMP" << 'IMPORT_EOF'
/* WORLD_MANAGER_IMPORT_START */
import WorldManagerContainer from '@/components/server/worldmanager/WorldManagerContainer';
/* WORLD_MANAGER_IMPORT_END */
IMPORT_EOF

    insert_at_top "$ROUTES_FILE" "$IMPORT_TMP"
    rm -f "$IMPORT_TMP"
    echo "  [OK] Import injected"

    if grep -q "WORLD_MANAGER_ROUTE_START" "$ROUTES_FILE"; then
        remove_block "$ROUTES_FILE" "WORLD_MANAGER_ROUTE_START" "WORLD_MANAGER_ROUTE_END"
    fi

    ROUTE_TMP=$(mktemp)
    cat > "$ROUTE_TMP" << 'ROUTE_EOF'
        /* WORLD_MANAGER_ROUTE_START */
        {
            path: '/worldmanager',
            permission: null,
            name: 'Worlds',
            component: WorldManagerContainer,
            exact: true,
        },
        /* WORLD_MANAGER_ROUTE_END */
ROUTE_EOF

    INJECTED=false
    if grep -q 'server: \[' "$ROUTES_FILE"; then
        insert_after "$ROUTES_FILE" "server: [" "$ROUTE_TMP"
        INJECTED=true
        echo "  [OK] Route injected into server[] array"
    fi

    # Nova theme uses: export const serverRoutes = [
    if [ "$INJECTED" = false ] && grep -q 'serverRoutes.*=.*\[' "$ROUTES_FILE"; then
        insert_after "$ROUTES_FILE" "serverRoutes" "$ROUTE_TMP"
        INJECTED=true
        echo "  [OK] Route injected into serverRoutes[] array"
    fi

    if [ "$INJECTED" = false ] && grep -q 'export default \[' "$ROUTES_FILE"; then
        insert_after "$ROUTES_FILE" "export default [" "$ROUTE_TMP"
        INJECTED=true
        echo "  [OK] Route injected into export default[]"
    fi

    if [ "$INJECTED" = false ]; then
        # Find the first path: inside an array literal (skip interface/type definitions)
        # Look for lines with path: followed by a quote (actual route) not path: string (type def)
        FIRST_PATH_LINE=$(grep -n "path: ['\"/]" "$ROUTES_FILE" | head -1 | cut -d: -f1)
        if [ -n "$FIRST_PATH_LINE" ]; then
            head -n $((FIRST_PATH_LINE - 1)) "$ROUTES_FILE" > "${ROUTES_FILE}.tmp"
            cat "$ROUTE_TMP" >> "${ROUTES_FILE}.tmp"
            tail -n +$FIRST_PATH_LINE "$ROUTES_FILE" >> "${ROUTES_FILE}.tmp"
            mv "${ROUTES_FILE}.tmp" "$ROUTES_FILE"
            INJECTED=true
            echo "  [OK] Route injected via fallback"
        else
            echo "  ERROR: Could not find injection point in $ROUTES_FILE"
            rm -f "$ROUTE_TMP"
            exit 1
        fi
    fi
    rm -f "$ROUTE_TMP"

    SR_FILE="resources/scripts/routers/ServerRouter.tsx"
    IS_MODERN=false
    [ -f "resources/scripts/routers/routes.ts" ] && IS_MODERN=true

    if [ -f "$SR_FILE" ]; then
        if grep -q "WORLD_MANAGER_NAV_START" "$SR_FILE"; then
            remove_block "$SR_FILE" "WORLD_MANAGER_NAV_START" "WORLD_MANAGER_NAV_END"
        fi

        if [ "$IS_MODERN" = true ]; then
            echo "  Nav tab auto-generated from routes.ts"
        else
            NAV_TMP=$(mktemp)
            cat > "$NAV_TMP" << 'NAV_EOF'
                    {/* WORLD_MANAGER_NAV_START */}
                    <NavLink to={`${match.url}/worldmanager`} exact>Worlds</NavLink>
                    {/* WORLD_MANAGER_NAV_END */}
NAV_EOF

            if grep -q 'Activity' "$SR_FILE" && grep -q '</NavLink>' "$SR_FILE"; then
                ACTIVITY_LINE=$(grep -n 'Activity.*</NavLink>' "$SR_FILE" | tail -1 | cut -d: -f1)
                if [ -n "$ACTIVITY_LINE" ]; then
                    head -n "$ACTIVITY_LINE" "$SR_FILE" > "${SR_FILE}.tmp"
                    cat "$NAV_TMP" >> "${SR_FILE}.tmp"
                    tail -n +$((ACTIVITY_LINE + 1)) "$SR_FILE" >> "${SR_FILE}.tmp"
                    mv "${SR_FILE}.tmp" "$SR_FILE"
                    echo "  [OK] Nav tab injected"
                elif grep -q '</SubNavigation>' "$SR_FILE"; then
                    awk -v ins="$NAV_TMP" '
                        /<\/SubNavigation>/ {
                            while ((getline line < ins) > 0) print line
                            close(ins)
                        }
                        { print }
                    ' "$SR_FILE" > "${SR_FILE}.tmp" && mv "${SR_FILE}.tmp" "$SR_FILE"
                    echo "  [OK] Nav tab injected"
                fi
            elif grep -q '</SubNavigation>' "$SR_FILE"; then
                awk -v ins="$NAV_TMP" '
                    /<\/SubNavigation>/ {
                        while ((getline line < ins) > 0) print line
                        close(ins)
                    }
                    { print }
                ' "$SR_FILE" > "${SR_FILE}.tmp" && mv "${SR_FILE}.tmp" "$SR_FILE"
                echo "  [OK] Nav tab injected"
            else
                echo "  WARNING: Could not find injection point for nav tab"
            fi
            rm -f "$NAV_TMP"
        fi
    fi

    echo "[3/4] Building Panel Assets..."

    if ! command -v yarn &> /dev/null; then
        echo ""
        echo "  yarn is not installed. It is required to compile panel assets."
        echo ""
        read -p "  Would you like to install Node.js + Yarn automatically? [y/N]: " install_yarn
        if [[ "$install_yarn" =~ ^[Yy]$ ]]; then
            echo "  Installing Node.js 22..."
            curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
            apt install -y nodejs
            echo "  Installing Yarn..."
            npm install -g yarn
            echo "  [OK] Node.js and Yarn installed."
        else
            echo ""
            echo "  Skipping asset build. The 'Worlds' tab will NOT appear until you:"
            echo "     1. Install Node.js and Yarn"
            echo "     2. Run: cd $PANEL_DIR && yarn install && yarn build:production"
            echo ""
            echo "  To install manually:"
            echo "     curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
            echo "     apt install -y nodejs"
            echo "     npm install -g yarn"
            echo ""

            echo "[4/4] Optimizing Panel..."
            php artisan view:clear
            php artisan optimize:clear
            chown -R www-data:www-data *

            echo ""
            echo "Installation partially complete (assets NOT built)."
            echo "   Route injected [OK]"
            echo "   Files copied [OK]"
            echo "   Assets NOT rebuilt -- install yarn and rebuild!"
            exit 0
        fi
    fi

    yarn install --ignore-engines
    export NODE_OPTIONS=--openssl-legacy-provider
    yarn build:production

    echo "[4/4] Optimizing Panel..."
    php artisan view:clear
    php artisan optimize:clear
    chown -R www-data:www-data *

    echo ""
    echo "Installation Complete!"
    echo "   Route injected into router"
    echo "   Worlds tab added to server nav bar"
    echo "   Assets rebuilt"

elif [ "$option" == "2" ]; then

    echo "Uninstalling World Manager Addon..."
    rm -rf resources/scripts/components/server/worldmanager

    echo "Removing injected routes and nav tab..."

    ROUTES_FILE=""
    if [ -f "resources/scripts/routers/routes.ts" ]; then
        ROUTES_FILE="resources/scripts/routers/routes.ts"
    elif [ -f "resources/scripts/routers/ServerRouter.tsx" ]; then
        ROUTES_FILE="resources/scripts/routers/ServerRouter.tsx"
    fi

    if [ -n "$ROUTES_FILE" ]; then
        if grep -q "WORLD_MANAGER_IMPORT_START" "$ROUTES_FILE"; then
            remove_block "$ROUTES_FILE" "WORLD_MANAGER_IMPORT_START" "WORLD_MANAGER_IMPORT_END"
            echo "  [OK] Removed import from $ROUTES_FILE"
        fi

        if grep -q "WORLD_MANAGER_ROUTE_START" "$ROUTES_FILE"; then
            remove_block "$ROUTES_FILE" "WORLD_MANAGER_ROUTE_START" "WORLD_MANAGER_ROUTE_END"
            echo "  [OK] Removed route from $ROUTES_FILE"
        fi
    fi

    SR_FILE="resources/scripts/routers/ServerRouter.tsx"
    if [ -f "$SR_FILE" ] && grep -q "WORLD_MANAGER_NAV_START" "$SR_FILE"; then
        remove_block "$SR_FILE" "WORLD_MANAGER_NAV_START" "WORLD_MANAGER_NAV_END"
        echo "  [OK] Removed nav tab from ServerRouter.tsx"
    fi

    echo "Rebuilding Panel Assets..."
    if command -v yarn &> /dev/null; then
        export NODE_OPTIONS=--openssl-legacy-provider
        yarn build:production
    else
        echo "  yarn not found -- skipping asset rebuild."
        echo "  Run manually: cd $PANEL_DIR && yarn install && yarn build:production"
    fi
    php artisan view:clear
    php artisan optimize:clear
    chown -R www-data:www-data *

    echo ""
    echo "Uninstallation Complete!"
else
    echo "Invalid option."
    exit 1
fi
