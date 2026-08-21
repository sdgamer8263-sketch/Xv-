<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Schedules;

use Pterodactyl\Models\Permission;

class StoreTaskRequest extends ViewScheduleRequest
{
    /**
     * Determine if the user is allowed to create a new task for this schedule. We simply
     * check if they can modify a schedule to determine if they're able to do this. There
     * are no task specific permissions.
     */
    public function permission(): string
    {
        return Permission::ACTION_SCHEDULE_UPDATE;
    }

    public function rules(): array
    {
        return [
            'action' => 'required|in:command,power,backup,discord,delete_files',
            'payload' => [
                'required_unless:action,backup',
                'string',
                'nullable',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($this->input('action') !== 'discord' || $value === null) {
                        return;
                    }
                    $data = json_decode($value, true);
                    if (!is_array($data) || !isset($data['url'])) {
                        $fail('The discord payload must be valid JSON containing a url field.');
                        return;
                    }
                    if (!self::isDiscordWebhookUrl($data['url'])) {
                        $fail('The discord webhook URL must be a valid Discord webhook URL.');
                    }
                },
            ],
            'time_offset' => 'required|numeric|min:0|max:900',
            'sequence_id' => 'sometimes|required|numeric|min:1',
            'continue_on_failure' => 'sometimes|required|boolean',
        ];
    }

    public static function isDiscordWebhookUrl(mixed $url): bool
    {
        if (!is_string($url)) {
            return false;
        }

        return (bool) preg_match(
            '#^https://(ptb\.|canary\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$#i',
            $url
        );
    }
}