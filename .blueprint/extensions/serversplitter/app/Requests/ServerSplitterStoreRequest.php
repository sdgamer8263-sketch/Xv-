<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerSplitterStoreRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'splitter.create';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:1|max:191',
            'description' => 'string|nullable',
            'sync_subusers' => 'required|boolean',
            'cpu' => 'required|int|min:0',
            'memory' => 'required|int|min:0',
            'disk' => 'required|int|min:0',
            'feature_limits' => 'required|array',
            'feature_limits.*' => 'required|int|min:0',
            'egg_id' => 'sometimes|string|uuid',
        ];
    }
}
