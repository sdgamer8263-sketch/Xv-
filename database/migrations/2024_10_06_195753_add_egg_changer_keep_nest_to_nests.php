<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddEggChangerKeepNestToNests extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('nests', function (Blueprint $table) {
            $table->tinyInteger('eggchanger_keep_nest')->unsigned()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('nests', function (Blueprint $table) {
            $table->dropColumn('eggchanger_keep_nest');
        });
    }
}
