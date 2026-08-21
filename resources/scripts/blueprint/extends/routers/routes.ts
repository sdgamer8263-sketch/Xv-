import React from 'react';

/* blueprint/import *//* ServersplitterImportStart */import ServersplitterUvgtpwvwpx from '@blueprint/extensions/serversplitter/ServerSplitterContainer';/* ServersplitterImportEnd *//* MinecraftplayermanagerImportStart */import MinecraftplayermanagerGolkgoangk from '@blueprint/extensions/minecraftplayermanager/PlayerManagerContainer';/* MinecraftplayermanagerImportEnd *//* MotdmakerImportStart */import MotdmakerVzffuiilfo from '@blueprint/extensions/motdmaker/MotdMakerContainer';/* MotdmakerImportEnd *//* ServerpropsmanagerImportStart */import ServerpropsmanagerIeorqofmff from '@blueprint/extensions/serverpropsmanager/ServerPropertiesManagerContainer';/* ServerpropsmanagerImportEnd *//* VersionchangerImportStart */import VersionchangerLciiqeerhf from '@blueprint/extensions/versionchanger/VersionChangerContainer';/* VersionchangerImportEnd *//* SagaminecraftmodpackinstallerImportStart */import SagaminecraftmodpackinstallerHkhqauwwjp from '@blueprint/extensions/sagaminecraftmodpackinstaller/ModpacksContainer';/* SagaminecraftmodpackinstallerImportEnd *//* ModrinthbrowserImportStart */import ModrinthbrowserTfjaaenyru from '@blueprint/extensions/modrinthbrowser/server/modrinth/ModrinthBrowserContainer';/* ModrinthbrowserImportEnd */

interface RouteDefinition {
  path: string;
  name: string | undefined;
  component: React.ComponentType;
  exact?: boolean;
  adminOnly: boolean | false;
  identifier: string;
}
interface ServerRouteDefinition extends RouteDefinition {
  permission: string | string[] | null;
}
interface Routes {
  account: RouteDefinition[];
  server: ServerRouteDefinition[];
}

export default {
  account: [
    /* routes/account *//* ServersplitterAccountRouteStart *//* ServersplitterAccountRouteEnd *//* MinecraftplayermanagerAccountRouteStart *//* MinecraftplayermanagerAccountRouteEnd *//* MotdmakerAccountRouteStart *//* MotdmakerAccountRouteEnd *//* ServerpropsmanagerAccountRouteStart *//* ServerpropsmanagerAccountRouteEnd *//* VersionchangerAccountRouteStart *//* VersionchangerAccountRouteEnd *//* SagaminecraftmodpackinstallerAccountRouteStart *//* SagaminecraftmodpackinstallerAccountRouteEnd *//* ModrinthbrowserAccountRouteStart *//* ModrinthbrowserAccountRouteEnd */
  ],
  server: [
    /* routes/server *//* ServersplitterServerRouteStart */{ path: '/splitter', permission: 'splitter.read', name: 'Splitter', component: ServersplitterUvgtpwvwpx, adminOnly: false, identifier: 'serversplitter' },/* ServersplitterServerRouteEnd *//* MinecraftplayermanagerServerRouteStart */{ path: '/minecraft/players', permission: 'control.console', name: 'Players', component: MinecraftplayermanagerGolkgoangk, adminOnly: false, identifier: 'minecraftplayermanager' },/* MinecraftplayermanagerServerRouteEnd *//* MotdmakerServerRouteStart */{ path: '/motd-maker', permission: null, name: 'MOTD Maker', component: MotdmakerVzffuiilfo, adminOnly: false, identifier: 'motdmaker' },/* MotdmakerServerRouteEnd *//* ServerpropsmanagerServerRouteStart */{ path: '/properties-manager', permission: null, name: 'Properties Manager', component: ServerpropsmanagerIeorqofmff, adminOnly: false, identifier: 'serverpropsmanager' },/* ServerpropsmanagerServerRouteEnd *//* VersionchangerServerRouteStart */{ path: '/minecraft/versions', permission: 'file.update', name: 'Versions', component: VersionchangerLciiqeerhf, adminOnly: false, identifier: 'versionchanger' },/* VersionchangerServerRouteEnd *//* SagaminecraftmodpackinstallerServerRouteStart */{ path: '/modpacks', permission: 'file.*', name: 'Modpacks', component: SagaminecraftmodpackinstallerHkhqauwwjp, adminOnly: false, identifier: 'sagaminecraftmodpackinstaller' },/* SagaminecraftmodpackinstallerServerRouteEnd *//* ModrinthbrowserServerRouteStart */{ path: '/plugins', permission: null, name: 'Plugins', component: ModrinthbrowserTfjaaenyru, adminOnly: false, identifier: 'modrinthbrowser' },/* ModrinthbrowserServerRouteEnd */
  ],
} as Routes;
