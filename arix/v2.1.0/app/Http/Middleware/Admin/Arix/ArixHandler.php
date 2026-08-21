<?php

namespace Pterodactyl\Http\Middleware\Admin\Arix;

use Illuminate\Http\Request;

class ArixHandler
{
    public function handle(Request $request, \Closure $next): mixed
    {
        return $next($request);
    }
}
