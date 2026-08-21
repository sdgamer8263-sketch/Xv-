<?php
Route::get('/admin/uploads', [Pterodactyl\Http\Controllers\Admin\Extensions\resourcemanager\resourcemanagerExtensionController::class, 'showUploadsForm'])->name('blueprint.extensions.resourcemanager.wrapper.admin.uploads');
Route::post('/admin/resourcemanager/uploads/upload', [Pterodactyl\Http\Controllers\Admin\Extensions\resourcemanager\resourcemanagerExtensionController::class, 'uploadImage'])->name('blueprint.extensions.resourcemanager.uploadImage');
Route::get('/admin/resourcemanager/uploads/list', [Pterodactyl\Http\Controllers\Admin\Extensions\resourcemanager\resourcemanagerExtensionController::class, 'listImages'])->name('blueprint.extensions.resourcemanager.listImages');
Route::delete('/admin/resourcemanager/uploads/delete', [Pterodactyl\Http\Controllers\Admin\Extensions\resourcemanager\resourcemanagerExtensionController::class, 'deleteImage'])->name('blueprint.extensions.resourcemanager.deleteImage');
?>