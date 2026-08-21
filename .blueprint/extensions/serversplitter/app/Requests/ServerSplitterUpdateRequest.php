<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerSplitterUpdateRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'splitter.update';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:1|max:191',
            'description' => 'sometimes|string|nullable',
            'cpu' => 'required|int|min:0',
            'memory' => 'required|int|min:0',
            'disk' => 'required|int|min:0',
            'feature_limits' => 'required|array',
            'feature_limits.*' => 'sometimes|int|min:0',
        ];
    }
}
