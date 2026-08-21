<?php

namespace Pterodactyl\Http\Controllers\Admin\Extensions\sagaminecraftmodpackinstaller;

use Illuminate\View\View;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Illuminate\Http\RedirectResponse;

use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;

class sagaminecraftmodpackinstallerExtensionController extends Controller
{
  public function __construct(
    private ViewFactory $view,
    private BlueprintExtensionLibrary $blueprint,
    private ConfigRepository $config,
    private SettingsRepositoryInterface $settings,
  ) {}
  
  public function index(): View
  {
    // GET DATABASE VALUES
    $curseforge_api_key = $this->blueprint->dbGet('sagaminecraftmodpackinstaller', 'config:curseforge_api_key');

    return $this->view->make(
      'admin.extensions.sagaminecraftmodpackinstaller.index', [
        'curseforge_api_key' => $curseforge_api_key,

        'root' => "/admin/extensions/sagaminecraftmodpackinstaller",
        'blueprint' => $this->blueprint,
      ]
    );
  }
  /**
   * @throws \Pterodactyl\Exceptions\Model\DataValidationException
   * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
   */
  public function update(sagaminecraftmodpackinstallerSettingsFormRequest $request): RedirectResponse
  {
    foreach ($request->normalize() as $key => $value) {
      $this->settings->set('sagaminecraftmodpackinstaller::' . $key, $value);
    }

    return redirect()->route('admin.extensions.sagaminecraftmodpackinstaller.index');
  }
}
class sagaminecraftmodpackinstallerSettingsFormRequest extends AdminFormRequest
{
  public function rules(): array
  {
    return [
      'config:curseforge_api_key' => 'string',
    ];
  }

  public function attributes(): array
  {
    return [
      'config:curseforge_api_key' => 'CurseForge API Key',
    ];
  }
}
