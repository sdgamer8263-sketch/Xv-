#!/bin/bash

if grep -q "// splitter" "$PTERODACTYL_DIRECTORY/app/Models/Permission.php"; then
	echo "Permissions already added in Permission.php ... Skipping"
else
	echo "Adding Permissions in Permission.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Models/Permission.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "'docker-image' => '" | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 3))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="

			'splitter' => [ // splitter
					'description' => 'Permissions that control a user\'s ability to split this server.', // splitter
					'keys' => [ // splitter
							'read' => 'Allows a user to view the split servers.', // splitter
							'create' => 'Allows a user to create a new server split.', // splitter
							'update' => 'Allows a user to modify an existing server split.', // splitter
							'delete' => 'Allows a user to delete an existing server split.', // splitter
					], // splitter
			], // splitter

	"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Models/Permission.php"

	echo "Adding Permissions in Permission.php ... Done"
fi

if grep -q "'parent_id' => \$server->parent_id," "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Client/ServerTransformer.php"; then
	echo "Properties already added in ServerTransformer.php ... Skipping"
else
	echo "Adding Properties in ServerTransformer.php ..."

	sed -z -i -e "s|'internal_id' => \$server->id,|'internal_id' => \$server->id,\n            'parent_id' => \$server->parent_id,|g" "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Client/ServerTransformer.php"
	sed -z -i -e "s|'databases' => \$server->database_limit,|'databases' => \$server->database_limit,\n                'splits' => \$server->splitter_limit,|g" "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Client/ServerTransformer.php"

	echo "Adding Properties in ServerTransformer.php ... Done"
fi

if grep -q "'splits' => \$server->splitter_limit," "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Application/ServerTransformer.php"; then
	echo "Properties already added in Application ServerTransformer.php ... Skipping"
else
	echo "Adding Properties in Application ServerTransformer.php ..."

	sed -z -i -e "s|'databases' => \$server->database_limit,|'databases' => \$server->database_limit,\n                'splits' => \$server->splitter_limit,|g" "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Application/ServerTransformer.php"

	echo "Adding Properties in Application ServerTransformer.php ... Done"
fi

if grep -q "parentId: data.parent_id" "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"; then
	echo "Properties already added in getServer.ts ... Skipping"
else
	echo "Adding Properties in getServer.ts ..."

	sed -z -i -e "s|internalId: data.internal_id,|internalId: data.internal_id,\n    parentId: data.parent_id,|g" "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
	sed -z -i -e "s|databases: number;|databases: number;\n        splits: number;|g" "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
	sed -z -i -e "s/internalId: number | string;/internalId: number | string;\n    parentId: number | null;/g" "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
	sed -z -i -e "s/internalId: number;/internalId: number;\n    parentId: number | null;/g" "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"

	echo "Adding Properties in getServer.ts ... Done"
fi

if grep -q "pSplitterLimit" "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/new.blade.php"; then
	echo "Properties already added in Server new.blade.php ... Skipping"
else
	echo "Adding Properties in Server new.blade.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/new.blade.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "The total number of databases a user is allowed to create for this server." | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
					<div class=\"form-group col-xs-6\"> <!-- splitter -->
						<label for=\"pSplitterLimit\" class=\"control-label\">Splitter Limit</label> <!-- splitter -->
						<div> <!-- splitter -->
							<input type=\"text\" id=\"pSplitterLimit\" name=\"splitter_limit\" class=\"form-control\" value=\"{{ old('splitter_limit', 0) }}\"/> <!-- splitter -->
						</div> <!-- splitter -->
						<p class=\"text-muted small\">The total number of server splits a user is allowed to create for this server.</p> <!-- splitter -->
					</div> <!-- splitter -->
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/new.blade.php"

	echo "Adding Properties in Server new.blade.php ... Done"
fi

if grep -q "pSplitterLimit" "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/view/build.blade.php"; then
	echo "Properties already added in Server build.blade.php ... Skipping"
else
	echo "Adding Properties in Server build.blade.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/view/build.blade.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "The total number of databases a user is allowed to create for this server." | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
								<div class=\"form-group col-xs-6\"> <!-- splitter -->
									<label for=\"pSplitterLimit\" class=\"control-label\">Splitter Limit</label> <!-- splitter -->
									<div> <!-- splitter -->
										<input type=\"text\" id=\"pSplitterLimit\" name=\"splitter_limit\" class=\"form-control\" {{ \$server->parent_id ? 'disabled' : '' }} value=\"{{ old('splitter_limit', \$server->splitter_limit) }}\"/> <!-- splitter -->
									</div> <!-- splitter -->
									<p class=\"text-muted small\">The total number of server splits a user is allowed to create for this server.</p> <!-- splitter -->
								</div> <!-- splitter -->
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/view/build.blade.php"

	echo "Adding Properties in Server build.blade.php ... Done"
fi

if grep -q "'splitter_limit'" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Admin/ServersController.php"; then
	echo "Properties already added in ServersController.php ... Skipping"
else
	echo "Adding Properties in ServersController.php ..."

	sed -i -e "s|'allocation_id', 'add_allocations', 'remove_allocations',|'allocation_id', 'add_allocations', 'remove_allocations', 'splitter_limit',|g" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Admin/ServersController.php"

	echo "Adding Properties in ServersController.php ... Done"
fi

if grep -q "'splitter_limit'" "$PTERODACTYL_DIRECTORY/app/Services/Servers/BuildModificationService.php"; then
	echo "Properties already added in BuildModificationService.php ... Skipping"
else
	echo "Adding Properties in BuildModificationService.php ..."

	sed -z -i -e "s|'database_limit' => Arr::get(\$data, 'database_limit', 0) ?? null,|'database_limit' => Arr::get(\$data, 'database_limit', 0) ?? null,\n                'splitter_limit' => Arr::get(\$data, 'splitter_limit', 0),|g" "$PTERODACTYL_DIRECTORY/app/Services/Servers/BuildModificationService.php"

	echo "Adding Properties in BuildModificationService.php ... Done"
fi

if grep -q "// splitter" "$PTERODACTYL_DIRECTORY/app/Models/Server.php"; then
	echo "Utilities already added in Server.php ... Skipping"
else
	echo "Adding Utilities in Server.php ..."

	sed -z -i -e "s|use Illuminate\\\\Database\\\\Eloquent\\\\Relations\\\\HasMany;|use Illuminate\\\\Database\\\\Eloquent\\\\Relations\\\\HasMany;\nuse Pterodactyl\\\\Transformers\\\\Api\\\\Application\\\\ServerTransformer;|g" "$PTERODACTYL_DIRECTORY/app/Models/Server.php"

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Models/Server.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "return \$this->status === self::STATUS_SUSPENDED;" | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="

    public function splits() // splitter
    { // splitter
        if (\$this->parent_id) { // splitter
            return Server::where('parent_id', \$this->parent_id) // splitter
                ->orWhere('id', \$this->parent_id) // splitter
                ->get(); // splitter
        } // splitter
        return \$this->hasMany(Server::class, 'parent_id', 'id')->get(); // splitter
    } // splitter

    public function totalResources() // splitter
    { // splitter
        \$servers = \$this->splits(); // splitter
        \$resources = [ // splitter
            'cpu' => \$this->cpu === 0 ? -1 : \$this->cpu, // splitter
            'memory' => \$this->memory, // splitter
            'disk' => \$this->disk === 0 ? -1 : \$this->disk, // splitter
            'feature_limits' => (new ServerTransformer())->transform(\$this)['feature_limits'] // splitter
        ]; // splitter
        foreach (\$servers as \$server) { // splitter
            if (\$server->cpu === 0) { // splitter
                \$resources['cpu'] = -1; // splitter
            } // splitter
            if (\$server->disk === 0) { // splitter
                \$resources['disk'] = -1; // splitter
            } // splitter
            if (\$server->id === \$this->id) { // splitter
                continue; // splitter
            } // splitter
            if (\$resources['cpu'] !== -1) { // splitter
                \$resources['cpu'] += \$server->cpu; // splitter
            } // splitter
            if (\$resources['disk'] !== -1) { // splitter
                \$resources['disk'] += \$server->disk; // splitter
            } // splitter
            \$resources['memory'] += \$server->memory; // splitter
            \$transformed = (new ServerTransformer())->transform(\$server); // splitter
            foreach (\$transformed['feature_limits'] as \$feature => \$limit) { // splitter
                if (!isset(\$resources['feature_limits'][\$feature])) { // splitter
                    \$resources['feature_limits'][\$feature] = 0; // splitter
                } // splitter
                \$resources['feature_limits'][\$feature] += \$limit; // splitter
            } // splitter
        } // splitter
        return \$resources; // splitter
    } // splitter"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Models/Server.php"

	echo "Adding Utilities in Server.php ... Done"
fi

if grep -q "blueprint.extensions.serversplitter.server" "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/partials/navigation.blade.php"; then
	echo "Warning already added in navigation.blade.php ... Skipping"
else
	echo "Adding Warning in navigation.blade.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/partials/navigation.blade.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "@endphp" | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
    @include(\"blueprint.extensions.serversplitter.server\") <!-- splitter -->
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/partials/navigation.blade.php"

	echo "Adding Warning in navigation.blade.php ... Done"
fi

if grep -q "'splitter_limit' =>" "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerCreationService.php"; then
	echo "Properties already added in ServerCreationService.php ... Skipping"
else
	echo "Adding Properties in ServerCreationService.php ..."

	sed -z -i -e "s|'backup_limit' => Arr::get(\$data, 'backup_limit') ?? 0,|'backup_limit' => Arr::get(\$data, 'backup_limit') ?? 0,\n            'splitter_limit' => Arr::get(\$data, 'splitter_limit') ?? 0,|g" "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerCreationService.php"

	echo "Adding Properties in ServerCreationService.php ... Done"
fi

if grep -q "\$subservers = Server::query()->where('parent_id', \$server->id)->get();" "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerDeletionService.php"; then
	echo "Subserver handling already added in ServerDeletionService.php ... Skipping"
else
	echo "Adding Subserver handling in ServerDeletionService.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerDeletionService.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "public function handle(Server \$server): void" | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
        if (\$server->parent_id) { // splitter
            \$parent = Server::whereId(\$server->parent_id)->firstOrFail(); // splitter
            if (\$server->cpu > 0 && \$parent->cpu > 0) { // splitter
                \$parent->increment('cpu', \$server->cpu); // splitter
            } // splitter
            \$parent->increment('memory', \$server->memory); // splitter
            if (\$server->disk > 0 && \$parent->disk > 0) { // splitter
                \$parent->increment('disk', \$server->disk); // splitter
            } // splitter
            \$transformed = (new \Pterodactyl\Transformers\Api\Application\ServerTransformer())->transform(\$server); // splitter
            foreach (\$transformed['feature_limits'] as \$key => \$value) { // splitter
                if (\$key === 'splits') { // splitter
                    continue; // splitter
                } // splitter
                try { // splitter
                    \$modKey = \$key; // splitter
                    if (str_ends_with(\$key, 'ies')) { // splitter
                        \$modKey = substr(\$key, 0, -3) . 'y'; // splitter
                    } else if (str_ends_with(\$key, 's')) { // splitter
                        \$modKey = substr(\$key, 0, -1); // splitter
                    } // splitter
                    \$parent->increment(\"{\$modKey}_limit\", \$value); // splitter
                } catch (\Exception \$exception) { // splitter
                    // ignore // splitter
                } // splitter
            } // splitter
            try { // splitter
                \$this->daemonServerRepository->setServer(\$parent)->sync(); // splitter
            } catch (\Exception \$exception) { // splitter
                if (!\$this->force) { // splitter
                    throw \$exception; // splitter
                } // splitter
            } // splitter
        } else { // splitter
            \$subservers = Server::query()->where('parent_id', \$server->id)->get(); // splitter
            foreach (\$subservers as \$subserver) { // splitter
                \$this->handle(\$subserver); // splitter
            } // splitter
        } // splitter
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerDeletionService.php"

	echo "Adding Subserver handling in ServerDeletionService.php ... Done"
fi

if grep -q "\$subservers = Server::query()->where('parent_id', \$server->id)->get();" "$PTERODACTYL_DIRECTORY/app/Services/Servers/SuspensionService.php"; then
	echo "Subserver handling already added in SuspensionService.php ... Skipping"
else
	echo "Adding Subserver handling in SuspensionService.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Services/Servers/SuspensionService.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "Assert::oneOf" | cut -f1 -d:)
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
        \$subservers = Server::query()->where('parent_id', \$server->id)->get(); // splitter
        foreach (\$subservers as \$subserver) { // splitter
            try { // splitter
                \$this->toggle(\$subserver, \$action); // splitter
            } catch (\\Throwable \$exception) { // splitter
                logger()->error(\$exception); // splitter
            } // splitter
        } // splitter
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Services/Servers/SuspensionService.php"

	echo "Adding Subserver handling in SuspensionService.php ... Done"
fi

# legacy:start
echo "Removing Properties in Egg new.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/eggs/new.blade.php"

echo "Removing Properties in Egg new.blade.php ... Done"

echo "Removing Properties in Egg view.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/eggs/view.blade.php"

echo "Removing Properties in Egg view.blade.php ... Done"

echo "Removing Properties in EggFormRequest.php ..."

sed -z -i "s/\n            'splitter_enabled' => 'sometimes|boolean',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Egg/EggFormRequest.php"
sed -z -i "s/\n            'splitter_enabled' => array_get(\$data, 'splitter_enabled', false),//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Egg/EggFormRequest.php"

echo "Removing Properties in EggFormRequest.php ... Done"

echo "Removing Properties in Egg.php ..."

sed -z -i "s|\n        'splitter_enabled',||g" "$PTERODACTYL_DIRECTORY/app/Models/Egg.php"

echo "Removing Properties in Egg.php ... Done"

echo "Removing Properties in Nest new.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/nests/new.blade.php"

echo "Removing Properties in Nest new.blade.php ... Done"

echo "Removing Properties in Nest view.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/nests/view.blade.php"

echo "Removing Properties in Nest view.blade.php ... Done"

echo "Removing Properties in StoreNestFormRequest.php ..."

sed -z -i "s/\n            'splitter_keep_nest' => 'sometimes|boolean',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Nest/StoreNestFormRequest.php"

echo "Removing Properties in StoreNestFormRequest.php ... Done"

echo "Removing Properties in Nest.php ..."

sed -z -i "s|\n        'splitter_keep_nest',||g" "$PTERODACTYL_DIRECTORY/app/Models/Nest.php"

echo "Removing Properties in Nest.php ... Done"

echo "Removing Properties in NestCreationService.php ..."

sed -z -i "s|\n            'splitter_keep_nest' => array_get(\$data, 'splitter_keep_nest', false),||g" "$PTERODACTYL_DIRECTORY/app/Services/Nests/NestCreationService.php"

echo "Removing Properties in NestCreationService.php ... Done"
# legacy:end

if grep -q "// splitter" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"; then
	echo "Resize Handling already added in ServerDetailsController.php ... Skipping"
else
	echo "Adding Resize Handling in ServerDetailsController.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "\$server = \$this->buildModificationService->handle(\$server, \$request->validated());" | cut -f1 -d:)
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
        if (!\$server->parent_id) { // splitter
            \$children = Server::query()->where('parent_id', \$server->id)->get(); // splitter
            \$totalResources = \$server->totalResources(); // splitter
            if (\$children->isNotEmpty()) { // splitter
                \$data = \$request->validated(); // splitter
                if (isset(\$data['cpu']) && \$data['cpu'] !== 0 && \$data['cpu'] !== \$server->cpu) { // splitter
                    if (\$data['cpu'] >= \$totalResources['cpu']) { // splitter
                        \$added = \$data['cpu'] - \$totalResources['cpu']; // splitter
                        \$server->increment('cpu', \$added); // splitter
                        \$server->saveOrFail(); // splitter
                    } else { // splitter
                        \$total = \$data['cpu']; // splitter
                        \$share = \$total / (\$children->count() + 1); // splitter
                        \$server->cpu = ceil(\$share); // splitter
                        \$server->saveOrFail(); // splitter
                        foreach (\$children as \$child) { // splitter
                            \$child->cpu = floor(\$share); // splitter
                            \$child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                if (isset(\$data['memory']) && \$data['memory'] !== 0 && \$data['memory'] !== \$server->memory) { // splitter
                    if (\$data['memory'] >= \$totalResources['memory']) { // splitter
                        \$added = \$data['memory'] - \$totalResources['memory']; // splitter
                        \$server->increment('memory', \$added); // splitter
                        \$server->saveOrFail(); // splitter
                    } else { // splitter
                        \$total = \$data['memory']; // splitter
                        \$share = \$total / (\$children->count() + 1); // splitter
                        \$server->memory = ceil(\$share); // splitter
                        \$server->saveOrFail(); // splitter
                        foreach (\$children as \$child) { // splitter
                            \$child->memory = floor(\$share); // splitter
                            \$child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                if (isset(\$data['disk']) && \$data['disk'] !== 0 && \$data['disk'] !== \$server->disk) { // splitter
                    if (\$data['disk'] >= \$totalResources['disk']) { // splitter
                        \$added = \$data['disk'] - \$totalResources['disk']; // splitter
                        \$server->increment('disk', \$added); // splitter
                        \$server->saveOrFail(); // splitter
                    } else { // splitter
                        \$total = \$data['disk']; // splitter
                        \$share = \$total / (\$children->count() + 1); // splitter
                        \$server->disk = ceil(\$share); // splitter
                        \$server->saveOrFail(); // splitter
                        foreach (\$children as \$child) { // splitter
                            \$child->disk = floor(\$share); // splitter
                            \$child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                foreach (\$data as \$key => \$value) { // splitter
                    if (!str_ends_with(\$key, '_limit') || \$value === 0) { // splitter
                        continue; // splitter
                    } // splitter
                    if (\$key === 'splitter_limit') { // splitter
                        \$server->{\$key} = \$value; // splitter
                        continue; // splitter
                    } // splitter
                    \$modKey = substr(\$key, 0, -6); // splitter
                    if (str_ends_with(\$modKey, 'y')) { // splitter
                        \$modKey = substr(\$modKey, 0, -1) . 'ie'; // splitter
                    } // splitter
                    \$modKey .= 's'; // splitter
                    if (\$value >= \$totalResources['feature_limits'][\$modKey]) { // splitter
                        try { // splitter
                            \$added = \$value - \$totalResources['feature_limits'][\$modKey]; // splitter
                            \$server->increment(\$key, \$added); // splitter
                            \$server->saveOrFail(); // splitter
                        } catch (\Exception \$exception) { // splitter
                            // ignore // splitter
                        } // splitter
                    } else { // splitter
                        \$total = \$value; // splitter
                        \$share = \$total / (\$children->count() + 1); // splitter
                        \$server->{\$key} = ceil(\$share); // splitter
                        \$server->saveOrFail(); // splitter
                        foreach (\$children as \$child) { // splitter
                            \$child->{\$key} = floor(\$share); // splitter
                            \$child->saveOrFail(); // splitter
                        } // splitter
                    } // splitter
                } // splitter
                \$server->saveOrFail(); // splitter
                \$this->detailsModificationService->handle(\$server, \$server->toArray()); // splitter
                foreach (\$children as \$child) { // splitter
                    \$this->detailsModificationService->handle(\$child, \$child->toArray()); // splitter
                } // splitter
            } else { // splitter
                \$server = \$this->buildModificationService->handle(\$server, \$request->validated()); // splitter
            } // splitter
        } else { // splitter
            \$server = \$this->buildModificationService->handle(\$server, \$request->validated()); // splitter
        } // splitter
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"

	sed -z -i -e "s|\n        \$server = \$this->buildModificationService->handle(\$server, \$request->validated());||g" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"

	echo "Adding Resize Handling in ServerDetailsController.php ... Done"
fi

if grep -q "'feature_limits.splits' => " "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/UpdateServerBuildConfigurationRequest.php"; then
	echo "Properties already added in UpdateServerBuildConfigurationRequest.php ... Skipping"
else
	echo "Adding Properties in UpdateServerBuildConfigurationRequest.php ..."

	sed -z -i -e "s/'feature_limits.backups' => \$rules\['backup_limit'\],/'feature_limits.backups' => \$rules\['backup_limit'\],\n            'feature_limits.splits' => 'sometimes|int|min:0',/" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/UpdateServerBuildConfigurationRequest.php"
	sed -z -i -e "s|\$data\['backup_limit'\] = \$data\['feature_limits'\]\['backups'\] ?? null;|\$data\['backup_limit'\] = \$data\['feature_limits'\]\['backups'\] ?? null;\n        \$data\['splitter_limit'\] = \$data\['feature_limits'\]\['splits'\] ?? 0;|g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/UpdateServerBuildConfigurationRequest.php"

	echo "Adding Properties in UpdateServerBuildConfigurationRequest.php ... Done"
fi

if grep -q "'feature_limits.splits' => " "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/StoreServerRequest.php"; then
	echo "Properties already added in StoreServerRequest.php ... Skipping"
else
	echo "Adding Properties in StoreServerRequest.php ..."

	sed -z -i -e "s/'feature_limits.backups' => \$rules\['backup_limit'\],/'feature_limits.backups' => \$rules\['backup_limit'\],\n            'feature_limits.splits' => 'sometimes|int|min:0',/" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/StoreServerRequest.php"
	sed -z -i -e "s|'database_limit' => array_get(\$data, 'feature_limits.databases'),|'database_limit' => array_get(\$data, 'feature_limits.databases'),\n            'splitter_limit' => array_get(\$data, 'feature_limits.splits', 0),|g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/StoreServerRequest.php"

	echo "Adding Properties in StoreServerRequest.php ... Done"
fi