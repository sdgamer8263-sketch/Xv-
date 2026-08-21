<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddServerSplitterToEggs extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->tinyInteger('splitter_enabled')->unsigned()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->dropColumn('splitter_enabled');
        });
    }
}
