<?php

use Pterodactyl\Models\Server;

$totalResources = $server->totalResources();
$splits = $server->splits();
$parent = $server->parent_id ? Server::whereId($server->parent_id)->first() : null;

?>

@if($parent)
    <div class="col-xs-12" style="margin-bottom: 20px;">
        <div class="alert alert-warning no-margin-bottom">
            This server is a <strong>subserver</strong> of
            <a href="{{ route('admin.servers.view', $parent->id) }}">{{ $parent->name }}</a>.
            Total Resources:
            <ul class="list-inline no-margin-bottom" style="margin-top: 5px;">
                <li><strong>CPU:</strong> {{ $totalResources['cpu'] }}%</li>
                <li><strong>Memory:</strong> {{ $totalResources['memory'] }} MB</li>
                <li><strong>Disk:</strong> {{ $totalResources['disk'] }} MB</li>
            </ul>
            <ul class="list-inline no-margin-bottom">
                @foreach($totalResources['feature_limits'] as $limit => $value)
                    <li><strong>{{ strtoupper($limit[0]) . substr($limit, 1) }}:</strong> {{ $value }}</li>
                @endforeach
            </ul>
        </div>
    </div>

    <div class="col-xs-12" style="margin-bottom: 20px;">
        <div class="alert alert-danger no-margin-bottom">
            <strong>Warning:</strong> Changes to this subserver will disrupt limits. Be careful.
        </div>
    </div>
@elseif($splits->count() > 0)
    <div class="col-xs-12" style="margin-bottom: 20px;">
        <div class="alert alert-warning no-margin-bottom">
            This server has been split into multiple servers (
                @foreach($splits as $split)
                    <a href="{{ route('admin.servers.view', $split->id) }}">{{ $split->name }}</a>
                    @if(!$loop->last)
                        ,
                    @endif
                @endforeach
            ). Total Resources:
            <ul class="list-inline no-margin-bottom" style="margin-top: 5px;">
                <li><strong>CPU:</strong> {{ $totalResources['cpu'] }}%</li>
                <li><strong>Memory:</strong> {{ $totalResources['memory'] }} MB</li>
                <li><strong>Disk:</strong> {{ $totalResources['disk'] }} MB</li>
            </ul>
            <ul class="list-inline no-margin-bottom">
                @foreach($totalResources['feature_limits'] as $limit => $value)
                    <li><strong>{{ strtoupper($limit[0]) . substr($limit, 1) }}:</strong> {{ $value }}</li>
                @endforeach
            </ul>
        </div>
    </div>

    <div class="col-xs-12" style="margin-bottom: 20px;">
        <div class="alert alert-danger no-margin-bottom">
            <strong>Warning:</strong> Changes to the parent server will disrupt limits. Be careful.
        </div>
    </div>
@endif