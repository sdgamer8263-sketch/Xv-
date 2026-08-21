<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerSplitterDestroyRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'splitter.delete';
    }
}
