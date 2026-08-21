<?php
namespace Pterodactyl\Http\Requests\Admin\Arix;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class ArixRequest extends AdminFormRequest {
    public function rules(): array {
        return [
            'logo' => ['required', 'string'],
            'logoLight' => 'required|string',
            'fullLogo' => 'required|boolean',
            'logoHeight' => 'required|integer',
            'discord' => 'nullable|string',
            'support' => 'nullable|string|url',
            'extension_icons' => 'nullable|string',
        ];
    }
}
