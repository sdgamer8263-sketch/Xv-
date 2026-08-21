<?php

namespace Pterodactyl\Http\Controllers\Admin\Extensions\eggchanger;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Pterodactyl\Models\Egg;

class eggchangerPostFormRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'type' => 'required|string',
        ];
    }
}

class eggchangerExtensionController extends Controller
{
    public function __construct(
        private ViewFactory $view,
        private BlueprintExtensionLibrary $blueprint,
    ) {}

    public function index(): View
    {
        return $this->view->make(
            'admin.extensions.eggchanger.index', [
                'root' => '/admin/extensions/eggchanger',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('egg_changer_eggs')->get(),
            ]
        );
    }

    public function post(eggchangerPostFormRequest $request): View
    {
        $type = $request->input('type');

        switch ($type) {
            case 'configuration':
                $data = $this->validate($request, [
                    'force_update_startup_command' => 'required|string|in:0,1',
                    'force_reinstall' => 'required|string|in:0,1',
                    'force_delete_files' => 'required|string|in:0,1',
                ]);

                foreach ($data as $key => $value) {
                    $this->blueprint->dbSet('eggchanger', $key, $value);
                }

                $this->blueprint->notify('Applied new settings');
                break;

            case 'egg-rule-create':
                DB::table('egg_changer_eggs')->insert([
                    'eggs' => '[]',
                    'allowed_eggs' => '[]',
                ]);

                $this->blueprint->notify('Egg Rule successfully created.');
                break;

            case 'egg-rule-update':
                $data = $this->validate($request, [
                    'id' => 'required|integer|exists:egg_changer_eggs,id',
                    'eggs' => 'required|array',
                    'eggs.*' => 'integer|exists:eggs,id',
                    'allowed_eggs' => 'required|array',
                    'allowed_eggs.*' => 'integer|exists:eggs,id',
                ]);

                DB::table('egg_changer_eggs')->where('id', $data['id'])->update([
                    'eggs' => json_encode($data['eggs']),
                    'allowed_eggs' => json_encode($data['allowed_eggs']),
                ]);

                $this->blueprint->notify('Egg Rule successfully updated.');
                break;
        }

        return $this->view->make(
            'admin.extensions.eggchanger.index', [
                'root' => '/admin/extensions/eggchanger',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('egg_changer_eggs')->get(),
            ]
        );
    }

    public function delete(Request $request): View
    {
        $id = $request->route('id');

        DB::table('egg_changer_eggs')->where('id', (int) $id)->delete();

        $this->blueprint->notify('Egg Rule successfully deleted.');

        return $this->view->make(
            'admin.extensions.eggchanger.index', [
                'root' => '/admin/extensions/eggchanger',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('egg_changer_eggs')->get(),
            ]
        );
    }
}