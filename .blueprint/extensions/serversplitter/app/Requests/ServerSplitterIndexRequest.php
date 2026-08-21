<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerSplitterIndexRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'splitter.read';
    }
}
