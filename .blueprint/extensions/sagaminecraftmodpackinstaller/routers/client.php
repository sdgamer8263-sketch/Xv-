<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;
use Pterodactyl\Http\Middleware\Activity\ServerSubject;
use Pterodactyl\Http\Middleware\Api\Client\Server\ResourceBelongsToServer;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;

/*
|--------------------------------------------------------------------------
| Client Control API
|--------------------------------------------------------------------------
|
| Endpoint: /api/client/extensions/modpackinstaller/servers/{server}
|
*/
Route::group([
    'prefix' => '/servers/{server}',
    'middleware' => [
        ServerSubject::class,
        AuthenticateServerAccess::class,
        ResourceBelongsToServer::class,
    ],
], function () {
    Route::group(['prefix' => '/modpacks'], function () {
        Route::get('/', [sagaminecraftmodpackinstaller\ModpackController::class, 'index']);
        Route::get('/filters', [sagaminecraftmodpackinstaller\ModpackController::class, 'filters']);
        Route::get('/versions', [sagaminecraftmodpackinstaller\ModpackController::class, 'versions']);
        Route::post('/install', [sagaminecraftmodpackinstaller\ModpackController::class, 'install']);
    });
});
