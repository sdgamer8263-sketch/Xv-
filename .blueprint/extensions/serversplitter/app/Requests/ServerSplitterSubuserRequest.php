<?php

namespace Pterodactyl\BlueprintFramework\Extensions\serversplitter\Requests;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerSplitterSubuserRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'splitter.update';
    }
}
