<?php

namespace Pterodactyl\BlueprintFramework\Extensions\eggchanger\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class EggChangerIndexRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'settings.change-egg';
    }
}
