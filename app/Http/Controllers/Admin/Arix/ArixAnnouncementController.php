<?php

namespace Pterodactyl\Http\Controllers\Admin\Arix;

use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\Arix\ArixAnnouncementRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class ArixAnnouncementController extends Controller
{
    /**
     * IndexController constructor.
     */
    public function __construct(
        private AlertsMessageBag $alert,
        private SettingsRepositoryInterface $settings,
        private ViewFactory $view
    ) {
    }

    private function responseData() {
        return [
            'enabled' => filter_var($this->settings->get('settings::arix:announcement:enabled', false), FILTER_VALIDATE_BOOLEAN),
            'position' => (string) $this->settings->get('settings::arix:announcement:position', 'top'),
            'color' => (string) $this->settings->get('settings::arix:announcement:color', '#16aaaa'),
            'icon' => (string) $this->settings->get('settings::arix:announcement:icon', "megaphone"),
            'message' => (string) $this->settings->get('settings::arix:announcement:message', 'We have a brand new game panel design!'),
            'cta' => filter_var($this->settings->get('settings::arix:announcement:cta', false), FILTER_VALIDATE_BOOLEAN),
            'ctaTitle' => (string) $this->settings->get('settings::arix:announcement:ctaTitle', 'Buy now!'),
            'ctaLink' => (string) $this->settings->get('settings::arix:announcement:ctaLink', '/'),
            'dismissable' => filter_var($this->settings->get('settings::arix:announcement:dismissable', false), FILTER_VALIDATE_BOOLEAN),
        ];
    }

    public function index(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->responseData());
    }

    public function store(ArixAnnouncementRequest $request)
    {
        $payload = $request->validated();

            $settings = [
                'enabled' => filter_var($payload['enabled'], FILTER_VALIDATE_BOOLEAN),
                'position' => (string) $payload['position'],
                'color' => (string) $payload['color'],
                'icon' => (string) $payload['icon'],
                'message' => (string) $payload['message'],
                'cta' => filter_var($payload['cta'], FILTER_VALIDATE_BOOLEAN),
                'ctaTitle' => (string) $payload['ctaTitle'],
                'ctaLink' => (string) $payload['ctaLink'],
                'dismissable' => filter_var($payload['dismissable'], FILTER_VALIDATE_BOOLEAN),
            ];

            foreach ($settings as $key => $value) {
                $this->settings->set('settings::arix:announcement:' . $key, $value);
            }

            $this->alert->success('Theme settings have been updated successfully.')->flash();

        return response()->json($this->responseData());
    }
}