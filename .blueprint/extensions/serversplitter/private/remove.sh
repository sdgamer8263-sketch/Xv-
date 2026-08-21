#!/bin/bash

echo "Removing Permissions in Permission.php ..."

sed -i '/\/\/ splitter$/d' "$PTERODACTYL_DIRECTORY/app/Models/Permission.php"

echo "Removing Permissions in Permission.php ... Done"

echo "Removing Properties in ServerTransformer.php ..."

sed -i '/            'parent_id' => \$server->parent_id,/d' "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Client/ServerTransformer.php"
sed -i '/                'splits' => \$server->splitter_limit,/d' "$PTERODACTYL_DIRECTORY/app/Transformers/Api/Client/ServerTransformer.php"

echo "Removing Properties in ServerTransformer.php ... Done"

echo "Removing Properties in getServer.ts ..."

sed -i 's|    parentId: data.parent_id,||g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
sed -i 's|        splits: number;||g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
sed -i 's/    parentId: number | null;//g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
sed -i 's|  parentId: data.parent_id,||g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
sed -i 's|    splits: number;||g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"
sed -i 's/  parentId: number | null;//g' "$PTERODACTYL_DIRECTORY/resources/scripts/api/server/getServer.ts"

echo "Removing Properties in getServer.ts ... Done"

echo "Removing Properties in Server new.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/new.blade.php"

echo "Removing Properties in Server new.blade.php ... Done"

echo "Removing Properties in Server build.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/view/build.blade.php"

echo "Removing Properties in Server build.blade.php ... Done"

echo "Removing Properties in ServersController.php ..."

sed -i -e "s| 'splitter_limit',||g" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Admin/ServersController.php"

echo "Removing Properties in ServersController.php ... Done"

echo "Removing Properties in BuildModificationController.php ..."

sed -z -i -e "s|\n                'splitter_limit' => Arr::get(\$data, 'splitter_limit', 0),||g" "$PTERODACTYL_DIRECTORY/app/Services/Servers/BuildModificationService.php"

echo "Removing Properties in BuildModificationController.php ... Done"

echo "Removing Utilities in Server.php ..."

sed -z -i -e "s|\nuse Pterodactyl\\\\Transformers\\\\Api\\\\Application\\\\ServerTransformer;||g" "$PTERODACTYL_DIRECTORY/app/Models/Server.php"
sed -i '/\/\/ splitter$/d' "$PTERODACTYL_DIRECTORY/app/Models/Server.php"

echo "Removing Utilities in Server.php ... Done"

echo "Removing Utilities in navigation.blade.php ..."

sed -i '/<!-- splitter -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/partials/navigation.blade.php"
sed -z -i -e 's|\n    $totalResources = $server->parent_id ? $server->totalResources() : null;||g' "$PTERODACTYL_DIRECTORY/resources/views/admin/servers/partials/navigation.blade.php"

echo "Removing Utilities in navigation.blade.php ... Done"

echo "Removing Properties in ServerCreationService.php ..."

sed -z -i -e "s|\n            'splitter_limit' => Arr::get(\$data, 'splitter_limit') ?? 0,||g" "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerCreationService.php"

echo "Removing Properties in ServerCreationService.php ... Done"

echo "Removing Subserver handling in ServerDeletionService.php ..."

sed -i '/\/\/ splitter$/d' "$PTERODACTYL_DIRECTORY/app/Services/Servers/ServerDeletionService.php"

echo "Removing Subserver handling in ServerDeletionService.php ... Done"

echo "Removing Subserver handling in SuspensionService.php ..."

sed -i '/\/\/ splitter$/d' "$PTERODACTYL_DIRECTORY/app/Services/Servers/SuspensionService.php"

echo "Removing Subserver handling in SuspensionService.php ... Done"

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

echo "Removing Resize handling in ServerDetailsController.php ..."

sed -i '/\/\/ splitter$/d' "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"
if grep -q "\$server = \$this->buildModificationService->handle(\$server, \$request->validated());" "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"; then
	echo "Resize handling already removed in ServerDetailsController.php"
else
	INPUT=$(cat "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "public function build" | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 1))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
        \$server = \$this->buildModificationService->handle(\$server, \$request->validated());
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/app/Http/Controllers/Api/Application/Servers/ServerDetailsController.php"
fi

echo "Removing Resize handling in ServerDetailsController.php ... Done"

echo "Removing Properties in UpdateServerBuildConfigurationRequest.php ..."

sed -z -i -e "s/\n            'feature_limits.splits' => 'sometimes|int|min:0',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/UpdateServerBuildConfigurationRequest.php"
sed -z -i -e "s|\n        \$data\['splitter_limit'\] = \$data\['feature_limits'\]\['splits'\] ?? 0;||g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/UpdateServerBuildConfigurationRequest.php"

echo "Removing Properties in UpdateServerBuildConfigurationRequest.php ... Done"

echo "Removing Properties in StoreServerRequest.php ..."

sed -z -i -e "s/\n            'feature_limits.splits' => 'sometimes|int|min:0',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/StoreServerRequest.php"
sed -z -i -e "s|\n            'splitter_limit' => array_get(\$data, 'feature_limits.splits', 0),||g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Api/Application/Servers/StoreServerRequest.php"

echo "Removing Properties in StoreServerRequest.php ... Done"