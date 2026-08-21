#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[SAGA]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SAGA]${NC} $1"
}

FILES_TO_RESTORE=(
    "app/Models/Server.php"
    "resources/views/admin/servers/new.blade.php"
    "resources/views/admin/servers/view/build.blade.php"
    "app/Services/Servers/ServerCreationService.php"
    "app/Services/Servers/BuildModificationService.php"
    "app/Http/Controllers/Admin/ServersController.php"
    "app/Console/Kernel.php"
    "app/Transformers/Api/Client/ServerTransformer.php"
    "resources/scripts/api/server/getServer.ts"
    "resources/scripts/components/server/console/ServerConsoleContainer.tsx"
    "resources/scripts/components/dashboard/ServerRow.tsx"
)

print_message "Starting Auto Suspension feature removal..."

print_message "Restoring original files from backups..."
for file in "${FILES_TO_RESTORE[@]}"; do
    backup_file="${file}.saga"
    if [ -f "$backup_file" ]; then
        cp "$backup_file" "$file"
        print_message "Restored $file from backup"
        rm "$backup_file"
    else
        print_warning "Backup file $backup_file not found, skipping restoration"
    fi
done

SUSPEND_COMMAND="app/Console/Commands/Schedule/SuspendExpiredServers.php"
if [ -f "$SUSPEND_COMMAND" ]; then
    rm "$SUSPEND_COMMAND"
    print_message "Removed $SUSPEND_COMMAND"
fi