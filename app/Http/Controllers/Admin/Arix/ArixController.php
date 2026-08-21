<?php
namespace Pterodactyl\Http\Controllers\Admin\Arix;

use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\Arix\ArixRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class ArixController extends Controller
{
    public function __construct(private AlertsMessageBag $alert, private SettingsRepositoryInterface $settings, private ViewFactory $view) {}

    private function responseData() {
        return [
            'logo' => (string) $this->settings->get('settings::arix:general:logo', '/arix/Arix.png'),
            'logoLight' => (string) $this->settings->get('settings::arix:general:logoLight', '/arix/Arix.png'),
            'fullLogo' => filter_var($this->settings->get('settings::arix:general:fullLogo', false), FILTER_VALIDATE_BOOLEAN),
            'logoHeight' => (int) $this->settings->get('settings::arix:general:logoHeight', 32),
            'discord' => (string) $this->settings->get('settings::arix:general:discord', ''),
            'support' => (string) $this->settings->get('settings::arix:general:support', ''),
            'extension_icons' => (string) $this->settings->get('settings::arix:general:extension_icons', '{}'),
        ];
    }

    public function index(): \Illuminate\Http\JsonResponse { return response()->json($this->responseData()); }

    public function store(ArixRequest $request) {
        $payload = $request->validated();
        $settings = [
            'logo' => (string) $payload['logo'],
            'logoLight' => (string) $payload['logoLight'],
            'fullLogo' => filter_var($payload['fullLogo'], FILTER_VALIDATE_BOOLEAN),
            'logoHeight' => (int) $payload['logoHeight'],
            'discord' => isset($payload['discord']) ? (string) $payload['discord'] : null,
            'support' => isset($payload['support']) ? (string) $payload['support'] : null,
            'extension_icons' => isset($payload['extension_icons']) ? (string) $payload['extension_icons'] : '{}',
        ];

        foreach ($settings as $key => $value) { $this->settings->set('settings::arix:general:' . $key, $value); }
        
        // Save directly to public file for the sidebar to read instantly!
        file_put_contents(public_path('extension_icons.json'), $settings['extension_icons']);
        
        $this->alert->success('Settings updated successfully.')->flash();
        return response()->json($this->responseData());
    }
}
