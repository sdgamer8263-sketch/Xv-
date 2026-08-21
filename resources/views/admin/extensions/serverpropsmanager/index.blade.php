@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "serverpropsmanager";
    $EXTENSION_NAME = stripslashes("Server Properties Manager");
    $EXTENSION_VERSION = "1.0.0";
    $EXTENSION_DESCRIPTION = stripslashes("Feature-rich Java/Bedrock server.properties manager with auto detection and categorized controls.");
    $EXTENSION_ICON = "/assets/extensions/serverpropsmanager/icon.png";
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
  <strong>Server Properties Manager</strong> by <strong>WammuHost</strong>
</div>

<div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
  <h4 style="margin-top: 0; margin-bottom: 8px;">About This Extension</h4>
  <p style="margin-top: 0; margin-bottom: 8px;">This extension is active and managed by WammuHost.</p>
  <ul style="margin: 0; padding-left: 18px;">
    <li>Auto-detect Java or Bedrock properties format.</li>
    <li>Edit grouped properties with rich controls.</li>
    <li>Save and manage advanced/custom properties.</li>
  </ul>
</div>

<div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; padding: 12px;">
  <strong>Made by:</strong> WammuHost
</div>
@endsection
