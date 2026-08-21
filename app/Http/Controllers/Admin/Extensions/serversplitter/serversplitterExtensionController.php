<?php

namespace Pterodactyl\Http\Controllers\Admin\Extensions\serversplitter;

use Illuminate\View\View;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary;

class serversplitterPostFormRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'type' => 'required|string',
        ];
    }
}

class serversplitterExtensionController extends Controller
{
    public function __construct(
        private ViewFactory $view,
        private BlueprintAdminLibrary $blueprint,
    ) {}

    public function index(): View
    {
        return $this->view->make(
            'admin.extensions.serversplitter.index', [
                'root' => '/admin/extensions/serversplitter',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('server_splitter_eggs')->get(),
            ]
        );
    }

    public function post(serversplitterPostFormRequest $request): View
    {
        $type = $request->input('type');

        switch ($type) {
            case 'configuration':
                $data = $this->validate($request, [
                    'reserved_cpu' => 'required|integer|min:1',
                    'reserved_memory' => 'required|integer|min:1',
                    'reserved_disk' => 'required|integer|min:1',
                    'include_disk_usage' => 'required|string|in:1,0',
                    'display_reserved_limits' => 'required|string|in:1,0',
                ]);

                foreach ($data as $key => $value) {
                    $this->blueprint->dbSet('serversplitter', $key, $value);
                }

                $this->blueprint->notify('Applied new settings');
                break;

            case 'egg-rule-create':
                DB::table('server_splitter_eggs')->insert([
                    'eggs' => '[]',
                    'allowed_eggs' => '[]',
                ]);

                $this->blueprint->notify('Egg Rule successfully created.');
                break;

            case 'egg-rule-update':
                $data = $this->validate($request, [
                    'id' => 'required|integer|exists:server_splitter_eggs,id',
                    'eggs' => 'required|array',
                    'eggs.*' => 'integer|exists:eggs,id',
                    'allowed_eggs' => 'required|array',
                    'allowed_eggs.*' => 'integer|exists:eggs,id',
                ]);

                DB::table('server_splitter_eggs')->where('id', $data['id'])->update([
                    'eggs' => json_encode($data['eggs']),
                    'allowed_eggs' => json_encode($data['allowed_eggs']),
                ]);

                $this->blueprint->notify('Egg Rule successfully updated.');
                break;
        }

        return $this->view->make(
            'admin.extensions.serversplitter.index', [
                'root' => '/admin/extensions/serversplitter',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('server_splitter_eggs')->get(),
            ]
        );
    }

    public function delete(Request $request): View
    {
        $id = $request->route('id');

        DB::table('server_splitter_eggs')->where('id', (int) $id)->delete();

        $this->blueprint->notify('Egg Rule successfully deleted.');

        return $this->view->make(
            'admin.extensions.serversplitter.index', [
                'root' => '/admin/extensions/serversplitter',
                'blueprint' => $this->blueprint,
                'eggs' => Egg::query()->get(),
                'eggRules' => DB::table('server_splitter_eggs')->get(),
            ]
        );
    }
}