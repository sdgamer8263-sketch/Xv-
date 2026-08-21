#!/bin/bash

echo "Removing Properties in AdvancedSettingsFormRequest.php ..."

sed -z -i "s/\n            'mcvapi:types' => 'required|string|max:191|uppercase',//g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Settings/AdvancedSettingsFormRequest.php"

echo "Removing Properties in AdvancedSettingsFormRequest.php ... Done"

echo "Removing Properties in advanced.blade.php ..."

sed -i '/<!-- versionchanger -->$/d' "$PTERODACTYL_DIRECTORY/resources/views/admin/settings/advanced.blade.php"

echo "Removing Properties in advanced.blade.php ... Done"
