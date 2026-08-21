@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "modrinthbrowser";
    $EXTENSION_NAME = stripslashes("Modrinth Browser");
    $EXTENSION_VERSION = "1.2.2";
    $EXTENSION_DESCRIPTION = stripslashes("Browse and download Modrinth plugins directly from the server panel.");
    $EXTENSION_ICON = "/assets/extensions/modrinthbrowser/icon.png";
    $EXTENSION_WEBSITE = "[website]";
    $EXTENSION_WEBICON = "[webicon]";
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
    @yield('extension.description')<div class="container" style="max-width: 420px; margin: 48px auto;">
    <div class="card" style="padding: 2rem; box-shadow: 0 1px 4px #0001; border-radius: 10px;">
        <h2 style="margin-bottom: 1rem;">Curseforge Browser: Admin Settings</h2>
        <!-- TODO: Make BackEnd -->
        <form>
            <div style="margin-bottom: 1.25rem;">
                <label for="apiToken" style="font-weight: 500;">Curseforge API Token</label>
                <input type="password" class="form-control" id="apiToken" name="apiToken"
                    placeholder="Enter your Curseforge API token…" style="margin-top: 0.5rem;" disabled>
                <small class="form-text text-muted">
                    Required for plugin installation.<br>
                    The token will be securely stored.<br>
                    <span style="color:#c77c15;">(Coming soon: you&rsquo;ll be able to enter your API token here)</span>
                </small>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;" disabled>
                Save Token
            </button>
        </form>
    </div>
</div>
@endsection
