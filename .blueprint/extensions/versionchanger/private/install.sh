#!/bin/bash

if grep -q "'mcvapi:types' => '" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Settings/AdvancedSettingsFormRequest.php"; then
	echo "Properties already added in AdvancedSettingsFormRequest.php ... Skipping"
else
	echo "Adding Properties in AdvancedSettingsFormRequest.php ..."

	sed -z -i -e "s/'recaptcha:enabled' => 'required|in:true,false',/'recaptcha:enabled' => 'required|in:true,false',\n            'mcvapi:types' => 'required|string|max:191|uppercase',/g" "$PTERODACTYL_DIRECTORY/app/Http/Requests/Admin/Settings/AdvancedSettingsFormRequest.php"

	echo "Adding Properties in AdvancedSettingsFormRequest.php ... Done"
fi

if grep -q "mcvapi:types" "$PTERODACTYL_DIRECTORY/resources/views/admin/settings/advanced.blade.php"; then
	echo "Properties already added in advanced.blade.php ... Skipping"
else
	echo "Adding Properties in advanced.blade.php ..."

	INPUT=$(cat "$PTERODACTYL_DIRECTORY/resources/views/admin/settings/advanced.blade.php")
	INSERT_LINE=$(echo "$INPUT" | grep -n "The ending port in the range that can be automatically allocated." | cut -f1 -d:)
	INSERT_LINE=$((INSERT_LINE + 5))
	LINE_COUNT=$(echo "$INPUT" | wc -l)
	SECOND_HALF_COUNT=$((LINE_COUNT - INSERT_LINE))

	FRAGMENT="
                <div class=\"box\"> <!-- versionchanger -->
                    <div class=\"box-header with-border\"> <!-- versionchanger -->
                        <h3 class=\"box-title\">MCVAPI (Minecraft Version Changer) Softwares</h3> <!-- versionchanger -->
                    </div> <!-- versionchanger -->
                    <div class=\"box-body\"> <!-- versionchanger -->
                        <div class=\"row\"> <!-- versionchanger -->
                            <div class=\"form-group col-md-12\"> <!-- versionchanger -->
                                <label class=\"control-label\">Softwares</label> <!-- versionchanger -->
                                <div> <!-- versionchanger -->
                                    <p>Choices: {{ Cache::remember('mcvapi:types', 600, function () { try { return implode(', ', array_keys(json_decode(Http::get('https://versions.mcjars.app/api/v1/types')->body(), true)['types'])); } catch (\Exception \$e) { return 'unknown'; } }) }}</p> <!-- versionchanger -->
                                    <input class=\"form-control\" name=\"mcvapi:types\" value=\"{{ old('mcvapi:types', DB::table('settings')->where('key', '=', 'settings::mcvapi:types')->first()?->value ?? Cache::get('mcvapi:types')) }}\"> <!-- versionchanger -->
                                    <p class=\"text-muted small\">Enter softwares in the order you want them displayed.</p> <!-- versionchanger -->
                                </div> <!-- versionchanger -->
                            </div> <!-- versionchanger -->
                        </div> <!-- versionchanger -->
                    </div> <!-- versionchanger -->
                </div> <!-- versionchanger -->
"

	FIRST_HALF=$(echo "$INPUT" | head -n $INSERT_LINE)
	SECOND_HALF=$(echo "$INPUT" | tail -n $SECOND_HALF_COUNT)
	OUTPUT="${FIRST_HALF}${FRAGMENT}${SECOND_HALF}"
	echo "$OUTPUT" > "$PTERODACTYL_DIRECTORY/resources/views/admin/settings/advanced.blade.php"

	echo "Adding Properties in advanced.blade.php ... Done"
fi