<?php

use Pterodactyl\Http\Middleware\Activity\ServerSubject;
use Pterodactyl\Http\Middleware\Api\Client\Server\ResourceBelongsToServer;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;
use Illuminate\Support\Facades\Route;
use Pterodactyl\BlueprintFramework\Extensions\versionchanger;

Route::group([
	'prefix' => '/servers/{server}',
	'middleware' => [
		ServerSubject::class,
		AuthenticateServerAccess::class,
		ResourceBelongsToServer::class,
	],
], function () {
	Route::get('/installed', [versionchanger\VersionChangerController::class, 'installed']);
	Route::post('/install', [versionchanger\VersionChangerController::class, 'install']);

	Route::get('/types', [versionchanger\VersionChangerController::class, 'types']);
	Route::get('/types/{type}', [versionchanger\VersionChangerController::class, 'versions'])->middleware(['throttle:50,5']);
	Route::get('/types/{type}/{_version}', [versionchanger\VersionChangerController::class, 'builds'])->middleware(['throttle:50,5']);
});
