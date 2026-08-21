<?php

namespace Pterodactyl\Http\Controllers\Auth;

class ArixController extends AbstractLoginController
{
    public function index(): object
    {
        return response()->json([
            'status' => 'Available',
        ]);
    }
}