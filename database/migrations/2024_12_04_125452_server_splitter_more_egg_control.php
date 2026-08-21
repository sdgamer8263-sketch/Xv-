<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class ServerSplitterMoreEggControl extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->dropColumn('splitter_enabled');
        });

        Schema::table('nests', function (Blueprint $table) {
            $table->dropColumn('splitter_keep_nest');
        });

        Schema::create('server_splitter_eggs', function (Blueprint $table) {
            $table->id();

            $table->json('eggs');
            $table->json('allowed_eggs');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->tinyInteger('splitter_enabled')->unsigned()->default(0);
        });

        Schema::table('nests', function (Blueprint $table) {
            $table->tinyInteger('splitter_keep_nest')->unsigned()->default(0);
        });

        Schema::dropIfExists('server_splitter_eggs');
    }
}
