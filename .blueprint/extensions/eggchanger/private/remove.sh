#!/bin/bash

echo "Removing Permissions in Permission.php ..."

sed -z -i -e "s|'change-egg' => 'Allows a user to change the server egg.',||g" "$PTERODACTYL_DIRECTORY/app/Models/Permission.php"

echo "Removing Permissions in Permission.php ... Done"

echo "Removing Properties in Egg new.blade.php ..."

sed -i '/<!-- eggchanger -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/eggs/new.blade.php"

echo "Removing Properties in Egg new.blade.php ... Done"

echo "Removing Properties in Egg view.blade.php ..."

sed -i '/<!-- eggchanger -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/eggs/view.blade.php"

echo "Removing Properties in Egg view.blade.php ... Done"

echo "Removing Properties in EggFormRequest.php ..."

sed -z -i "s/\n            'eggchanger_enabled' => 'sometimes|boolean',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Egg/EggFormRequest.php"
sed -z -i "s/\n            'eggchanger_enabled' => array_get(\$data, 'eggchanger_enabled', false),//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Egg/EggFormRequest.php"

echo "Removing Properties in EggFormRequest.php ... Done"

echo "Removing Properties in Egg.php ..."

sed -z -i "s|\n        'eggchanger_enabled',||g" "$PTERODACTYL_DIRECTORY/app/Models/Egg.php"

echo "Removing Properties in Egg.php ... Done"

echo "Removing Properties in Nest new.blade.php ..."

sed -i '/<!-- eggchanger -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/nests/new.blade.php"

echo "Removing Properties in Nest new.blade.php ... Done"

echo "Removing Properties in Nest view.blade.php ..."

sed -i '/<!-- eggchanger -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/nests/view.blade.php"

echo "Removing Properties in Nest view.blade.php ... Done"

echo "Removing Properties in StoreNestFormRequest.php ..."

sed -z -i "s/\n            'eggchanger_keep_nest' => 'sometimes|boolean',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Nest/StoreNestFormRequest.php"

echo "Removing Properties in StoreNestFormRequest.php ... Done"

echo "Removing Properties in Nest.php ..."

sed -z -i "s|\n        'eggchanger_keep_nest',||g" "$PTERODACTYL_DIRECTORY/app/Models/Nest.php"

echo "Removing Properties in Nest.php ... Done"

echo "Removing Properties in NestCreationService.php ..."

sed -z -i "s|\n            'eggchanger_keep_nest' => array_get(\$data, 'eggchanger_keep_nest', false),||g" "$PTERODACTYL_DIRECTORY/app/Services/Nests/NestCreationService.php"

echo "Removing Properties in NestCreationService.php ... Done"