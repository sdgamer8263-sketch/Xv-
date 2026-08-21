<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class EggChangerMoreControl extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->dropColumn('eggchanger_enabled');
        });

        Schema::table('nests', function (Blueprint $table) {
            $table->dropColumn('eggchanger_keep_nest');
        });

        Schema::create('egg_changer_eggs', function (Blueprint $table) {
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
            $table->tinyInteger('eggchanger_enabled')->unsigned()->default(0);
        });

        Schema::table('nests', function (Blueprint $table) {
            $table->tinyInteger('eggchanger_keep_nest')->unsigned()->default(0);
        });

        Schema::dropIfExists('egg_changer_eggs');
    }
}
