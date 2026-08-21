<?php

namespace Pterodactyl\BlueprintFramework\Extensions\eggchanger\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class EggChangerUpdateRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'settings.change-egg';
    }

    public function rules(): array
    {
        return [
            'egg_id' => 'required|string|uuid',
            'change_startup' => 'required|boolean',
            'reinstall' => 'required|boolean',
            'delete_files' => 'required|boolean',
        ];
    }
}
