<?php

namespace Pterodactyl\BlueprintFramework\Extensions\versionchanger;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class VersionChangerInstallRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_FILE_UPDATE;
    }

    /**
     * Rules to validate this request against.
     */
    public function rules(): array
    {
        return [
            'build' => 'required|int|min:1',
            'delete_files' => 'required|boolean',
        ];
    }
}
