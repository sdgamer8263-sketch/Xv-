@extends('layouts.admin')
<?php 
    // Define extension information.
    $EXTENSION_ID = "serversplitter";
    $EXTENSION_NAME = stripslashes("Server Splitter");
    $EXTENSION_VERSION = "1.1.4";
    $EXTENSION_DESCRIPTION = stripslashes("Allow splitting Servers in the Dashboard easily with an intuitive UI.");
    $EXTENSION_ICON = "/assets/extensions/serversplitter/icon.jpg";
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
    @yield('extension.description')<?php
  $response = cache()->remember('product-serversplitter', 30 * 60, function () {
    return @file_get_contents("https://api.2038.buzz/products/serversplitter", false, stream_context_create([
      'http' => [
        'timeout' => 1
      ]
    ]));
  });

  if (!$response) {
    $version = 'Unknown';
    $providers = [];
    $changelog = [];
  } else {
    $data = json_decode($response, true);

    $version = $data['product']['version'];
    $providers = array_values($data['providers']);
    $changelog = [];

    foreach ($data['changelogs'] as $key => $change) {
      $changelog[] = [
        'version' => $key,
        'text' => $change['content'],
        'created' => $change['created']
      ];
    }
  }

  $nonceIdentifier = 'd4c187f863545451d8ec42789b30b70be253c11bf141d07bfebece616e143de4';
  $nonceIdentifierWithoutReplacement = '%%__NONCE' . '__%%';
?>

<div class="row">
  <div class="col-lg-5 col-md-5 col-sm-12 col-xs-12">
    <div class="box {{ $version !== 'Unknown' ? $version !== "1.1.4" ? 'box-danger' : 'box-primary' : 'box-primary' }}">
      <div class="box-header with-border">
        <h3 class="box-title"><i class='bx bx-git-repo-forked' ></i> Information</h3>
      </div>
      <div class="box-body">
        <p>
          Thank you for purchasing <b>Server Splitter</b>! You are currently using version <code>1.1.4</code> (latest version is <code>{{ $version }}</code>).
          If you have any questions or need help, please visit our <a href="https://discord.gg/0x7f6" target="_blank">Discord</a>.
          <b>{{ $nonceIdentifier === $nonceIdentifierWithoutReplacement ? "This is an indev version of the product!" : "" }}</b>
        </p>

        <div class="table-responsive" style="max-height: 250px; margin-bottom: 10px;">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 10px">Version</th>
                <th style="width: 100px">Date</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              @foreach ($changelog as $change)
                <tr>
                  <td style="{{ "1.1.4" === $change['version'] ? 'text-decoration: underline; font-weight: bold;' : '' }}">{{ $change['version'] }}</td>
                  <td>{{ Carbon\Carbon::parse($change['created'])->format('Y-m-d') }}</td>
                  <td style="white-space: pre-wrap;">{{ $change['text'] }}</td>
                </tr>
              @endforeach
            </tbody>
          </table>
        </div>

        <div class="row">
          @foreach ($providers as $provider)
            <div class="col-lg-6 col-md-6 col-sm-6 col-xs-6">
              <a href="{{ $provider['link'] }}" target="_blank" class="btn btn-primary btn-block"><i class='bx bx-store'></i> {{ $provider['name'] }}</a>
            </div>
          @endforeach
        </div>
      </div>
    </div>
  </div>

  <div class="col-lg-3 col-md-3 col-sm-12 col-xs-12">
    <div class="box">
      <div class="box-header with-border">
        <h3 class="box-title"><i class='bx bx-cog'></i> Configuration</h3>
      </div>
      <div class="box-body">
        <form method="post" action="{{ route('admin.extensions.serversplitter.index') }}">
          {{ csrf_field() }}
          <div class="form-group">
            <input type="hidden" name="type" value="configuration">

            <label for="reserved_cpu">Reserved/Min CPU (%)</label>
            <input type="number" placeholder="10" min="1" name="reserved_cpu" id="reserved_cpu" class="form-control" value="{{ $blueprint->dbGet('serversplitter', 'reserved_cpu') ?: '10' }}">
    
            <label for="reserved_memory" style="margin-top: 10px">Reserved/Min Memory (MiB)</label>
            <input type="number" placeholder="128" min="1" name="reserved_memory" id="reserved_memory" class="form-control" value="{{ $blueprint->dbGet('serversplitter', 'reserved_memory') ?: '128' }}">

            <label for="reserved_disk" style="margin-top: 10px">Reserved/Min Disk (MiB)</label>
            <input type="number" placeholder="256" min="1" name="reserved_disk" id="reserved_disk" class="form-control" value="{{ $blueprint->dbGet('serversplitter', 'reserved_disk') ?: '256' }}">

            <label for="include_disk_usage" style="margin-top: 10px">Include Disk Usage in Limits</label>
            <select name="include_disk_usage" id="include_disk_usage" class="form-control">
              <option value="1" {{ $blueprint->dbGet('serversplitter', 'include_disk_usage') === '1' ? 'selected' : '' }}>Yes</option>
              <option value="0" {{ $blueprint->dbGet('serversplitter', 'include_disk_usage') === '0' ? 'selected' : '' }}>No</option>
            </select>

            <label for="display_reserved_limits" style="margin-top: 10px">Display Reserved Limits in "Assigned" Boxes</label>
            <select name="display_reserved_limits" id="display_reserved_limits" class="form-control">
              <option value="1" {{ $blueprint->dbGet('serversplitter', 'display_reserved_limits') === '1' ? 'selected' : '' }}>Yes</option>
              <option value="0" {{ $blueprint->dbGet('serversplitter', 'display_reserved_limits') === '0' ? 'selected' : '' }}>No</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
      </div>
    </div>
  </div>

  <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
    <div class="box">
      <div class="box-header with-border">
        <h3 class="box-title"><i class='bx bxs-info-square'></i> Banner</h3>
      </div>
      <div class="box-body">
        <img src="/extensions/serversplitter/serversplitter_banner.jpg" class="img-rounded" alt="Banner" style="width: 100%;">
      </div>
    </div>
  </div>
</div>

<div class="row">
  <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
    <div class="box">
      <div class="box-header with-border">
        <h3 class="box-title"><i class='bx bx-chart'></i> Egg Rules</h3>
      </div>
      <div class="box-body">
        <form method="post" action="{{ route('admin.extensions.serversplitter.index') }}" style="display: inline;">
          @csrf
          <input type="hidden" name="type" value="egg-rule-create">
          <button style="margin-bottom: 10px;" type="submit" class="btn btn-primary"><i class='bx bx-plus'></i> Add</button>
        </form>

        @if(count($eggRules) > 0)
          <table class="table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Eggs</th>
                <th>Allowed Eggs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @foreach($eggRules as $eggRule)
                <tr>
                  <form method="post" action="{{ route('admin.extensions.serversplitter.index') }}" style="display: inline;">
                    @csrf
                    <input type="hidden" name="type" value="egg-rule-update">
                    <input type="hidden" name="id" value="{{ $eggRule->id }}">
                    <td>{{ $eggRule->id }}</td>
                    <td style="width: 30%">
                      <select name="eggs[]" id="eggs" class="form-control" multiple>
                        @foreach($eggs as $egg)
                          <option value="{{ $egg->id }}" {{ in_array((string) $egg->id, json_decode($eggRule->eggs)) ? 'selected' : '' }}>{{ $egg->name }}</option>
                        @endforeach
                      </select>
                    </td>
                    <td style="width: 50%">
                      <select name="allowed_eggs[]" id="allowed_eggs" class="form-control" multiple>
                        @foreach($eggs as $egg)
                          <option value="{{ $egg->id }}" {{ in_array((string) $egg->id, json_decode($eggRule->allowed_eggs)) ? 'selected' : '' }}>{{ $egg->name }}</option>
                        @endforeach
                      </select>
                    </td>
                    <td style="width: 20%">
                      <button type="submit" class="btn btn-primary"><i class='bx bx-save'></i> Save</button>
                      <button type="button" class="btn btn-danger" data-id="{{ $eggRule->id }}"><i class='bx bx-trash'></i> Delete</button>
                    </td>
                  </form>
                </tr>
              @endforeach
            </tbody>
          </table>
        @else
          <div>
            No egg rules found.
          </div>
        @endif
      </div>
    </div>
  </div>
</div>

@endsection

@section('footer-scripts')
@parent
<script>
  $('select[id*="eggs"]').select2();

  $('.btn-danger').on('click', function() {
    let id = $(this).data('id');
    let form = $('<form>', {
      'method': 'POST',
      'action': '{{ route("admin.extensions.serversplitter.index") }}/egg-rule/' + id
    });
    
    form.append('@csrf');
    form.append($('<input>', {
      'type': 'hidden',
      'name': '_method',
      'value': 'DELETE'
    }));
    
    $(document.body).append(form);
    form.submit();
  });
</script>
@endsection
