@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "motdmaker";
    $EXTENSION_NAME = stripslashes("MOTD Maker");
    $EXTENSION_VERSION = "1.1.0";
    $EXTENSION_DESCRIPTION = stripslashes("Create, preview, and save your Minecraft server MOTD from the panel.");
    $EXTENSION_ICON = "/assets/extensions/motdmaker/icon.png";
    $EXTENSION_WEBSITE = "https://wammuhost.com";
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
    @yield('extension.description')<div class="alert alert-info" role="alert" style="margin-bottom: 12px;">
  <strong>MOTD Maker</strong> by <strong>WammuHost</strong>
</div>

<div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
  <h4 style="margin-top: 0; margin-bottom: 8px;">About This Extension</h4>
  <p style="margin-top: 0; margin-bottom: 8px;">This extension is active and managed by WammuHost.</p>
  <ul style="margin: 0; padding-left: 18px;">
    <li>Create MOTD text with color/style code helpers.</li>
    <li>Preview MOTD output before saving.</li>
    <li>Save directly to server.properties.</li>
  </ul>
</div>

<div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; padding: 12px;">
  <strong>Made by:</strong> WammuHost
</div>
@endsection
