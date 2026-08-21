@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "sagaautosuspension";
    $EXTENSION_NAME = stripslashes("Auto Suspension");
    $EXTENSION_VERSION = "1.0";
    $EXTENSION_DESCRIPTION = stripslashes("Add Expiration Date to servers on Pterodactyl Panel to Auto Suspend");
    $EXTENSION_ICON = "/assets/extensions/sagaautosuspension/icon.jpg";
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
    @yield('extension.description')<p>Author: <code>SAGA</code> | Version <code>1.0</code> | Identifier: <code>sagaautosuspension</code></p>
<div class="box box-info">
  <div class="box-body">
    <p>
      Thank you for using Auto Suspension!.<br>If you have any questions/requests/help please visit our discord <a href="https://discord.gg/DU8cjUJjeN" target="_blank">here</a>.
    </p>
  </div>
</div>
@endsection
