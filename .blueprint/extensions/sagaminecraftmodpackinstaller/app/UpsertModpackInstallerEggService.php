<?php

namespace Pterodactyl\BlueprintFramework\Extensions\sagaminecraftmodpackinstaller;

use Illuminate\Http\UploadedFile;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Pterodactyl\Services\Eggs\Sharing\EggImporterService;
use Pterodactyl\Services\Eggs\Sharing\EggUpdateImporterService;
use Symfony\Component\HttpFoundation\File\UploadedFile as SymfonyUploadedFile;
use Illuminate\Support\Facades\Log;

class UpsertModpackInstallerEggService
{
    /**
     * @var EggImporterService
     */
    protected $eggImporterService;

    /**
     * @var EggUpdateImporterService
     */
    protected $eggUpdateImporterService;

    /**
     * UpsertModpackInstallerEggService constructor.
     */
    public function __construct(
        EggImporterService $eggImporterService,
        EggUpdateImporterService $eggUpdateImporterService
    ) {
        $this->eggImporterService = $eggImporterService;
        $this->eggUpdateImporterService = $eggUpdateImporterService;
    }

    /**
     * Upsert the modpack installer egg.
     * Always updates the egg to ensure it has the latest configuration.
     *
     * @return Egg
     */
    public function handle(): Egg
    {
        $eggPath = base_path('app/BlueprintFramework/Extensions/sagaminecraftmodpackinstaller/egg-minecraft--java-edition-modpack-installer.json');
        
        if (!file_exists($eggPath)) {
            Log::error('Modpack installer egg file not found at: ' . $eggPath);
            throw new \Exception('Modpack installer egg file not found.');
        }
        
        $uploadedFile = UploadedFile::createFromBase(
            new SymfonyUploadedFile($eggPath, 'egg-minecraft--java-edition-modpack-installer.json')
        );

        $eggJson = json_decode(file_get_contents($eggPath), true);
        $eggName = $eggJson['name'] ?? 'Minecraft: Java Edition Modpack Installer';
        $eggAuthor = $eggJson['author'] ?? 'modpack-installer@pterodactyl.io';
        
        $egg = Egg::where('name', $eggName)->first();
        
        if (!$egg) {
            $egg = Egg::where('author', $eggAuthor)->first();
        }
        
        if ($egg) {
            Log::info('Updating existing modpack installer egg', [
                'egg_id' => $egg->id,
                'egg_name' => $egg->name,
                'egg_author' => $egg->author
            ]);
            $this->eggUpdateImporterService->handle($egg, $uploadedFile);
            return $egg->refresh();
        } else {
            Log::info('Creating new modpack installer egg');
            
            $nest = Nest::where('name', 'Minecraft')->first();
            
            if (!$nest) {
                $nest = Nest::first();
                
                if (!$nest) {
                    throw new \Exception('No nest found to import the egg into.');
                }
            }
            
            return $this->eggImporterService->handle($uploadedFile, $nest->id);
        }
    }
}
