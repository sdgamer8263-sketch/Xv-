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

print_message "Creating backups of files to be modified..."

FILES_TO_BACKUP=(
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

for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "${file}.saga"
        print_message "Backed up $file"
    else
        print_warning "File $file not found, skipping backup"
    fi
done

# Step 1: Skip migration creation since it's already uploaded manually
print_message "Skipping migration creation as it was uploaded manually..."

# Step 2: Edit Server model
print_message "Updating Server model..."
SERVER_MODEL="app/Models/Server.php"
SERVER_MODEL_CONTENT=$(cat "$SERVER_MODEL")

# Check if expiration_date is already in the model
if grep -q "expiration_date" "$SERVER_MODEL"; then
    print_warning "Server model already contains expiration_date, skipping update"
else
    # Add expiration_date to the docblock
    SERVER_MODEL_CONTENT=$(echo "$SERVER_MODEL_CONTENT" | sed '/* @property \\Illuminate\\Support\\Carbon|null $installed_at/a\ * @property \\Illuminate\\Support\\Carbon|null $expiration_date')
    
    # Add expiration_date to the $casts array
    SERVER_MODEL_CONTENT=$(echo "$SERVER_MODEL_CONTENT" | sed "/'installed_at' => 'datetime'/a\        'expiration_date' => 'datetime'," )
    
    echo "$SERVER_MODEL_CONTENT" > "$SERVER_MODEL"
    print_message "Updated Server model"
fi

# Step 3: Edit new.blade.php
print_message "Updating server creation form..."
NEW_BLADE="resources/views/admin/servers/new.blade.php"

if grep -q "expiration_date" "$NEW_BLADE"; then
    print_warning "Server creation form already contains expiration_date, skipping update"
else
    # Find the position to insert the new form field
    sed -i "/<form action=\"{{ route('admin.servers.new') }}\" method=\"POST\">/a\\
    <div class=\"row\">\\
        <div class=\"col-xs-12\">\\
            <div class=\"box\">\\
            <div class=\"box-header with-border\">\\
                    <h3 class=\"box-title\">Auto Suspension</h3>\\
                </div>\\
                <div class=\"box-body row\">\\
                    <div class=\"form-group col-md-6\">\\
                        <label for=\"pExpirationDate\" class=\"control-label\">Expiration Date</label>\\
                        <div>\\
                            <input type=\"datetime-local\" id=\"pExpirationDate\" name=\"expiration_date\" class=\"form-control\" />\\
                        </div>\\
                        <p class=\"text-muted small\">The date when this server will be automatically suspended. Leave empty for no expiration.</p>\\
                    </div>\\
                </div>\\
            </div>\\
        </div>\\
    </div>" "$NEW_BLADE"
    print_message "Updated server creation form"
fi

# Step 4: Edit build.blade.php
print_message "Updating server build form..."
BUILD_BLADE="resources/views/admin/servers/view/build.blade.php"

if grep -q "expiration_date" "$BUILD_BLADE"; then
    print_warning "Server build form already contains expiration_date, skipping update"
else
    # Find the position to insert the new form field
    sed -i "/<form action=\"{{ route('admin.servers.view.build', \$server->id) }}\" method=\"POST\">/a\\
        <div class=\"col-sm-12\">\\
            <div class=\"box\">\\
                <div class=\"box-header with-border\">\\
                    <h3 class=\"box-title\">Auto Suspension</h3>\\
                </div>\\
                <div class=\"box-body\">\\
                    <div class=\"form-group\">\\
                        <label for=\"expiration_date\" class=\"control-label\">Expiration Date</label>\\
                        <div>\\
                            <input type=\"datetime-local\" id=\"expiration_date\" name=\"expiration_date\" class=\"form-control\" value=\"{{ \$server->expiration_date ? \\\\Carbon\\\\Carbon::parse(\$server->expiration_date)->format('Y-m-d\\\\TH:i') : '' }}\" />\\
                        </div>\\
                        <p class=\"text-muted small\">The date when this server will be automatically suspended. Leave empty for no expiration.</p>\\
                    </div>\\
                </div>\\
            </div>\\
        </div>" "$BUILD_BLADE"
    print_message "Updated server build form"
fi

# Step 5: Edit ServerCreationService.php
print_message "Updating ServerCreationService..."
SERVER_CREATION="app/Services/Servers/ServerCreationService.php"

if grep -q "expiration_date" "$SERVER_CREATION"; then
    print_warning "ServerCreationService already contains expiration_date, skipping update"
else
    sed -i "/'backup_limit' => Arr::get(\$data, 'backup_limit') ?? 0,/a\            'expiration_date' => Arr::get(\$data, 'expiration_date')," "$SERVER_CREATION"
    print_message "Updated ServerCreationService"
fi

# Step 6: Edit BuildModificationService.php
print_message "Updating BuildModificationService..."
BUILD_MODIFICATION="app/Services/Servers/BuildModificationService.php"

if grep -q "expiration_date" "$BUILD_MODIFICATION"; then
    print_warning "BuildModificationService already contains expiration_date, skipping update"
else
    sed -i "s/\$merge = Arr::only(\$data, \['oom_disabled', 'memory', 'swap', 'io', 'cpu', 'threads', 'disk', 'allocation_id'\]);/\$merge = Arr::only(\$data, ['oom_disabled', 'memory', 'swap', 'io', 'cpu', 'threads', 'disk', 'allocation_id', 'expiration_date']);/" "$BUILD_MODIFICATION"
    print_message "Updated BuildModificationService"
fi

# Step 7: Edit ServersController.php
print_message "Updating ServersController..."
SERVERS_CONTROLLER="app/Http/Controllers/Admin/ServersController.php"

if grep -q "expiration_date" "$SERVERS_CONTROLLER"; then
    print_warning "ServersController already contains expiration_date, skipping update"
else
    sed -i "/'oom_disabled',/a\            'expiration_date'," "$SERVERS_CONTROLLER"
    print_message "Updated ServersController"
fi

# Step 8: Create SuspendExpiredServers command
cp ".blueprint/extensions/sagaautosuspension/private/SuspendExpiredServers.php" "app/Console/Commands/SuspendExpiredServers.php"

# Step 9: Edit Kernel.php
print_message "Updating Kernel.php..."
KERNEL="app/Console/Kernel.php"

if grep -q "SuspendExpiredServers" "$KERNEL"; then
    print_warning "Kernel.php already contains SuspendExpiredServers, skipping update"
else
    # Add the import
    sed -i "/use Pterodactyl\\\\Console\\\\Commands\\\\Schedule\\\\ProcessRunnableCommand;/a use Pterodactyl\\\\Console\\\\Commands\\\\SuspendExpiredServers;" "$KERNEL"
    
    # Add the schedule
    sed -i "/\$schedule->command(CleanServiceBackupFilesCommand::class)->daily();/a\        \$schedule->command(SuspendExpiredServers::class)->everyMinute()->withoutOverlapping();" "$KERNEL"
    print_message "Updated Kernel.php"
fi

# Step 10: Edit ServerTransformer.php
print_message "Updating ServerTransformer..."
SERVER_TRANSFORMER="app/Transformers/Api/Client/ServerTransformer.php"

if grep -q "expiration_date" "$SERVER_TRANSFORMER"; then
    print_warning "ServerTransformer already contains expiration_date, skipping update"
else
    sed -i "/'is_transferring' => !is_null(\$server->transfer),/a\            'expiration_date' => \$server->expiration_date," "$SERVER_TRANSFORMER"
    print_message "Updated ServerTransformer"
fi

# Step 11: Edit getServer.ts
print_message "Updating getServer.ts..."
GET_SERVER="resources/scripts/api/server/getServer.ts"

if grep -q "expiration_date" "$GET_SERVER"; then
    print_warning "getServer.ts already contains expiration_date, skipping update"
else
    # Add to interface
    sed -i "/allocations: Allocation\[\];/a\    expiration_date: string | null;" "$GET_SERVER"
    
    # Add to transform function
    sed -i "/isTransferring: data.is_transferring,/a\    expiration_date: data.expiration_date || null," "$GET_SERVER"
    print_message "Updated getServer.ts"
fi

# Step 12: Edit ServerConsoleContainer.tsx
print_message "Updating ServerConsoleContainer.tsx..."
SERVER_CONSOLE="resources/scripts/components/server/console/ServerConsoleContainer.tsx"

if grep -q "ExpirationBadge" "$SERVER_CONSOLE"; then
    print_warning "ServerConsoleContainer.tsx already contains ExpirationBadge, skipping update"
else
    # Add imports
    sed -i "/import { Alert } from '@\/components\/elements\/alert';/a\import { format } from 'date-fns';\nimport { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\nimport { faClock } from '@fortawesome/free-solid-svg-icons';\nimport Tooltip from '@/components/elements/tooltip/Tooltip';\nimport styled from 'styled-components/macro';\nimport tw from 'twin.macro';\n\nconst ExpirationBadge = styled.span\`\n    \${tw\`ml-2 text-sm bg-neutral-600 text-gray-100 py-1 px-2 rounded-full inline-flex items-center transition-colors duration-150\`};\n    \&:hover {\n        \${tw\`cursor-pointer\`};\n    }\n\`;" "$SERVER_CONSOLE"
    
    # Add state
    sed -i "/const isNodeUnderMaintenance = ServerContext.useStoreState((state) => state.server.data!.isNodeUnderMaintenance);/a\    const expirationDate = ServerContext.useStoreState((state) => state.server.data!.expiration_date);" "$SERVER_CONSOLE"
    
    # Find the h1 tag with the server name and replace it
    perl -i -pe "s/\{name\}/\{name\}\n                        \{expirationDate \&\& \(\n                            <Tooltip placement=\"top\" content=\"Expiration Date\">\n                                <ExpirationBadge>\n                                    <FontAwesomeIcon icon=\{faClock\} className=\{\'mr-1\'\} \/>\n                                    \{format\(new Date\(expirationDate\), \'yyyy-MM-dd HH:mm\'\)\}\n                                <\/ExpirationBadge>\n                            <\/Tooltip>\n                        \)\}/g" "$SERVER_CONSOLE"
    print_message "Updated ServerConsoleContainer.tsx"
fi

# Step 13: Edit ServerRow.tsx
print_message "Updating ServerRow.tsx..."
SERVER_ROW="resources/scripts/components/dashboard/ServerRow.tsx"

if grep -q "ExpirationBadge" "$SERVER_ROW"; then
    print_warning "ServerRow.tsx already contains ExpirationBadge, skipping update"
else
    # Add imports
    sed -i "/import { faEthernet, faHdd, faMemory, faMicrochip, faServer } from '@fortawesome\/free-solid-svg-icons';/s/faServer/faServer, faClock/" "$SERVER_ROW"
    sed -i "/import isEqual from 'react-fast-compare';/a\import { format } from 'date-fns';\nimport Tooltip from '@/components/elements/tooltip/Tooltip';" "$SERVER_ROW"
    
    # Add styled component
    sed -i "/type Timer = ReturnType<typeof setInterval>;/i\const ExpirationBadge = styled.span\`\n    \${tw\`text-xs bg-neutral-600 text-gray-100 py-1 px-2 rounded-full inline-flex items-center transition-colors duration-150 ml-1\`};\`;\n" "$SERVER_ROW"
    
    # Replace server name with badge
    sed -i "s/{server.name}/{server.name} {server.expiration_date \&\& (\n                        <Tooltip placement=\"top\" content=\"Expiration Date\">\n                            <ExpirationBadge>\n                                <FontAwesomeIcon icon={faClock} css={tw\`text-xs mr-1\`} \/>\n                                {format(new Date(server.expiration_date), 'yyyy-MM-dd HH:mm')}\n                            <\/ExpirationBadge>\n                        <\/Tooltip>\n                    )}/" "$SERVER_ROW"
    print_message "Updated ServerRow.tsx"
fi