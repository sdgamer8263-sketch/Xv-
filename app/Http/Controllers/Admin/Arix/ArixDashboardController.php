<?php

namespace Pterodactyl\Http\Controllers\Admin\Arix;

use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\Arix\ArixDashboardRequest;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class ArixDashboardController extends Controller
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

    public function index(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->responseData());
    }

    private function responseData(): array
    {
        $widgets = json_decode((string) $this->settings->get('settings::arix:dashboardWidgets', '[]'), true);
        if (!is_array($widgets)) {
            $widgets = [];
        }

        return [
            'dashboardWidgets' => array_values($widgets),
        ];
    }

    public function store(ArixDashboardRequest $request)
    {
        $payload = $request->validated();
            $widgets = $payload['dashboardWidgets'] ?? [];
            if (!is_array($widgets)) {
                $widgets = [];
            }

            $widgets = array_values(
                array_filter($widgets, fn ($item) => is_string($item) && $item !== '')
            );

            $this->settings->set('settings::arix:dashboardWidgets', json_encode($widgets));

            $this->alert->success('Theme settings have been updated successfully.')->flash();

        return response()->json($this->responseData());
    }
}