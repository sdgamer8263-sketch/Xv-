@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "sagaminecraftmodpackinstaller";
    $EXTENSION_NAME = stripslashes("SAGA Minecraft Modpack Installer");
    $EXTENSION_VERSION = "1.6";
    $EXTENSION_DESCRIPTION = stripslashes("Manage and Install Minecraft Modpack directly from Panel");
    $EXTENSION_ICON = "/assets/extensions/sagaminecraftmodpackinstaller/icon.jpg";
    $EXTENSION_WEBSITE = "https://bbyb.it/saga";
    $EXTENSION_WEBICON = "bi bi-link-45deg";
?>
@include('blueprint.admin.template')

@section('title')
    {{ $EXTENSION_NAME }}
@endsection

@section('content-header')
    @yield('extension.header')
@endsection

@section('content')
    @yield('extension.config')
    @yield('extension.description')<p>Author: <code>SAGA</code> | Version <code>1.6</code> | Identifier: <code>sagaminecraftmodpackinstaller</code></p>
<div class="box box-info">
  <div class="box-body">
    <p>
      Thank you for using SAGA Minecraft Modpack Installer!.<br>If you have any questions/requests/help please visit our discord <a href="https://discord.gg/DU8cjUJjeN" target="_blank">here</a>.
    </p>
  </div>
</div>
<form id="config-form" action="" method="POST">
  <script>
    // Show save button upon form input changes.
    document.addEventListener("DOMContentLoaded", function () {showSaveButton()});
    function showSaveButton() {
      const sagaminecraftmodpackinstaller_configForm = document.getElementById("config-form");
      const sagaminecraftmodpackinstaller_saveOverlay = document.getElementById("save-overlay");

      sagaminecraftmodpackinstaller_configForm.addEventListener("change", function () {
        sagaminecraftmodpackinstaller_saveOverlay.style.display = "inline";
        setTimeout(() => {
          sagaminecraftmodpackinstaller_saveOverlay.style.bottom = "10px";
        }, 100)
      });
    }
  </script>

  <div class="row">

    <div class="col-xs-12 col-md-4 col-lg-3">
      <div class="box box-info">
        <div class="box-header with-border">

          <h3 class="box-title">
            CurseForge
          </h3>

        </div>
        <div class="box-body">

            <div class="col-xs-12">
              <label class="control-label text-truncate">
                CurseForge API Key
              </label>

              <input 
                type="text"
                name="config:curseforge_api_key"
                id="config:curseforge_api_key"
                value="{{ $curseforge_api_key }}"
                class="form-control"
              />

              <p class="text-muted small">
              Enter your CurseForge API key to enable CurseForge modpack integration. You can get an API key from <a href="https://console.curseforge.com">CurseForge Developer Console</a>.
              </p>
              <div id="save-overlay">{{ csrf_field() }}<button type="submit" name="_method" value="PATCH" style="transition: background-color .3s;" class="btn btn-primary btn-sm">Apply Changes</button></div>
            </div>

        </div>
      </div>
    </div>

  </div>
</form>
@endsection
