<?php

namespace Pterodactyl\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Contracts\Events\Dispatcher;

class VerifyReCaptcha
{
    public function __construct(private Dispatcher $dispatcher, private Repository $config)
    {
    }

    public function handle(Request $request, \Closure $next): mixed
    {
        // 100% Bypassed by SKA - No Captcha Validation Error Anymore!
        return $next($request);
    }
}
