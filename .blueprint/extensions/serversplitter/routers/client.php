<?php

use Pterodactyl\Http\Middleware\Activity\ServerSubject;
use Pterodactyl\Http\Middleware\Api\Client\Server\ResourceBelongsToServer;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;
use Illuminate\Support\Facades\Route;
use Pterodactyl\BlueprintFramework\Extensions\serversplitter;

Route::group([
	'prefix' => '/servers/{server}',
	'middleware' => [
		ServerSubject::class,
		AuthenticateServerAccess::class,
		ResourceBelongsToServer::class,
	],
], function () {
	Route::get('/', [serversplitter\ServerSplitterController::class, 'index']);
	Route::get('/nests', [serversplitter\ServerSplitterController::class, 'nests']);

	Route::post('/', [serversplitter\ServerSplitterController::class, 'store']);
	Route::delete('/{subserver}', [serversplitter\ServerSplitterController::class, 'destroy']);
	Route::patch('/{subserver}', [serversplitter\ServerSplitterController::class, 'update']);
	Route::post('/{subserver}/subusers-sync', [serversplitter\ServerSplitterController::class, 'subusers']);
});
