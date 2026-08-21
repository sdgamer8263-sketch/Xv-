<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddServerSplitterKeepNestToNests extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('nests', function (Blueprint $table) {
            $table->tinyInteger('splitter_keep_nest')->unsigned()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('nests', function (Blueprint $table) {
            $table->dropColumn('splitter_keep_nest');
        });
    }
}
