import React, { useEffect, useState, useMemo } from 'react';
import { ServerContext } from '@/state/server';
import routes from '@/routers/routes';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';
import PermissionRoute from '@/components/elements/PermissionRoute';
import Spinner from '@/components/elements/Spinner';
import { NotFound, PremiumFeature } from '@/components/elements/ScreenBlock';
import TransitionRouter from '@/TransitionRouter';
import { useLocation } from 'react-router';
import { ApplicationStore } from '@/state';
import { useStoreState } from 'easy-peasy';
import Icon from '@/components/admin/elements/IconMap';
import Can from '@/components/elements/Can';
import { LinkCategory, LinkItem } from '@/api/admin/Link';
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/solid';
import blueprintRoutes from '@blueprint/extends/routers/routes';
import { FaEdit, FaGlobe, FaCogs, FaCodeBranch, FaBoxOpen, FaPlug, FaMap, FaUsers, FaFileImport, FaPuzzlePiece, FaLayerGroup, FaCube, FaRocket, FaBolt, FaTerminal, FaArchive, FaDatabase, FaCalendarAlt } from 'react-icons/fa';

const shouldDisplayRoute = (route: any, nestId?: number, eggId?: number): boolean => {
    const hasNestMatch = route.nestIds?.includes(nestId ?? 0) || route.nestId === nestId;
    const hasEggMatch = route.eggIds?.includes(eggId ?? 0) || route.eggId === eggId;
    const hasNoRestrictions = !route.eggIds && !route.nestIds && !route.nestId && !route.eggId;
    return hasNestMatch || hasEggMatch || hasNoRestrictions;
};

const useServerIds = () => {
    const nestId = ServerContext.useStoreState((state) => state.server.data?.nestId);
    const eggId = ServerContext.useStoreState((state) => state.server.data?.eggId);
    const tier = ServerContext.useStoreState((state) => state.server.data?.tier);
    return { nestId, eggId, tier };
};

const usePathBuilder = () => {
    const match = useRouteMatch<{ id: string }>();
    return (value: string, useUrl = false) => {
        const base = (useUrl ? match.url : match.path).replace(/\/*$/, '');
        return `${base}/${value.replace(/^\/+/, '')}`;
    };
};

const getAdjustedPath = (path: string, isDashboardDisabled: boolean) => path === '/console' && isDashboardDisabled ? '/' : path;

const Link = (props: LinkItem) => {
    const { t } = useTranslation('arix/navigation');
    const { nestId, eggId, tier } = useServerIds();
    const tierVisibility = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.advanced?.tierVisibility ?? 'show');
    const permissions = (props.permission ?? []).filter((p) => p && p.trim().length > 0);
    const hasNestRestrictions = Array.isArray(props.nests) && props.nests.length > 0;
    const hasEggRestrictions = Array.isArray(props.eggs) && props.eggs.length > 0;
    const hasTierRestrictions = Array.isArray(props.tier) && props.tier.length > 0;
    const nestMatches = hasNestRestrictions && typeof nestId === 'number' && props.nests?.includes(nestId) === true;
    const eggMatches = hasEggRestrictions && typeof eggId === 'number' && props.eggs?.includes(eggId) === true;
    const tierMatches = hasTierRestrictions && tier !== null && tier !== undefined && props.tier?.includes(tier) === true;
    const hasRestrictions = hasNestRestrictions || hasEggRestrictions || hasTierRestrictions;
    const showStar = hasTierRestrictions && tier !== null && tier !== undefined && !tierMatches && tierVisibility === 'show';
    const shouldHide = hasTierRestrictions && tier !== null && tier !== undefined && !tierMatches && tierVisibility === 'hidden';
    const buildPath = usePathBuilder();

    if (hasRestrictions && !nestMatches && !eggMatches && shouldHide) return null;

    const linkContent = (
        <>
            <div className='routers_link_icon'><Icon name={props.icon} size='1.25rem' /></div>
            <span className='routers_link_title'>{t(props.name)}</span>
            {showStar && <StarIcon className='w-3 text-yellow-500' />}
        </>
    );

    const inner = props.url.includes('http') ? (
        <div className='relative'><a href={props.url} target='_blank' rel='noreferrer' className='routers_link'>{linkContent}</a></div>
    ) : (
        <div className='relative'><NavLink to={buildPath(props.url, true)} exact={props.url === '/'} className='routers_link'>{linkContent}</NavLink></div>
    );

    return permissions.length > 0 ? <Can action={permissions} matchAny>{inner}</Can> : inner;
};

const Category = (props: LinkCategory) => {
    const { t } = useTranslation('arix/navigation');
    const { nestId, eggId } = useServerIds();
    const permissions = (props.permission ?? []).filter((p) => p && p.trim().length > 0);
    const hasNestRestrictions = Array.isArray(props.nests) && props.nests.length > 0;
    const hasEggRestrictions = Array.isArray(props.eggs) && props.eggs.length > 0;
    const nestMatches = hasNestRestrictions && typeof nestId === 'number' && props.nests?.includes(nestId) === true;
    const eggMatches = hasEggRestrictions && typeof eggId === 'number' && props.eggs?.includes(eggId) === true;

    if ((hasNestRestrictions || hasEggRestrictions) && !nestMatches && !eggMatches) return null;

    const inner = (
        <div className='routers_category-wrapper'>
            <span className='routers_category'>{t(props.name)}</span>
            <div className='routers_links'>{props.links.map((link) => <Link key={link.name} {...link} />)}</div>
        </div>
    );

    return permissions.length > 0 ? <Can action={permissions} matchAny>{inner}</Can> : inner;
};

const blueprintExtensions = [...new Set(blueprintRoutes.server.map((route) => route.identifier))];

const useExtensionEggs = () => {
    const [extensionEggs, setExtensionEggs] = useState<{ [x: string]: string[] }>(
        blueprintExtensions.reduce((prev, current) => ({ ...prev, [current]: ['-1'] }), {})
    );
    useEffect(() => {
        (async () => {
            const newEggs: { [x: string]: string[] } = {};
            for (const id of blueprintExtensions) {
                try {
                    const resp = await fetch(`/api/client/extensions/blueprint/eggs?${new URLSearchParams({ id })}`);
                    newEggs[id] = (await resp.json()) as string[];
                } catch (e) { newEggs[id] = ['-1']; }
            }
            setExtensionEggs(newEggs);
        })();
    }, []);
    return extensionEggs;
};

const useBlueprintServerRoutes = () => {
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin ?? false);
    const serverEgg = ServerContext.useStoreState((state) => state.server.data?.BlueprintFramework?.eggId);
    const extensionEggs = useExtensionEggs();
    return useMemo(() => {
        return blueprintRoutes.server
            .filter((route) => !!route.name)
            .filter((route) => (route.adminOnly ? rootAdmin : true))
            .filter((route) => {
                const eggs = extensionEggs[route.identifier];
                if (!eggs) return false;
                return eggs.includes('-1') || eggs.includes(String(serverEgg));
            });
    }, [rootAdmin, serverEgg, extensionEggs]);
};

const getRouteKey = (route: any) => `${route.name || ''} ${route.path || ''} ${route.identifier || ''}`.toLowerCase();

const renderBlueprintIcon = (route: any) => {
    const key = getRouteKey(route);
    if (key.includes('plugin')) return <FaPlug size="1.25rem" />;
    if (key.includes('mod')) return <FaBoxOpen size="1.25rem" />;
    if (key.includes('version')) return <FaCodeBranch size="1.25rem" />;
    if (key.includes('propert') || key.includes('setting')) return <FaCogs size="1.25rem" />;
    if (key.includes('player') || key.includes('user')) return <FaUsers size="1.25rem" />;
    if (key.includes('world') || key.includes('map')) return <FaMap size="1.25rem" />;
    if (key.includes('icon') || key.includes('import')) return <FaFileImport size="1.25rem" />;
    if (key.includes('motd')) return <FaEdit size="1.25rem" />;
    if (key.includes('subdomain') || key.includes('domain')) return <FaGlobe size="1.25rem" />;
    if (key.includes('backup') || key.includes('archive')) return <FaArchive size="1.25rem" />;
    if (key.includes('database') || key.includes('mysql')) return <FaDatabase size="1.25rem" />;
    if (key.includes('schedule') || key.includes('task')) return <FaCalendarAlt size="1.25rem" />;
    const icons = [<FaPuzzlePiece size="1.25rem" />, <FaLayerGroup size="1.25rem" />, <FaCube size="1.25rem" />, <FaRocket size="1.25rem" />, <FaBolt size="1.25rem" />, <FaTerminal size="1.25rem" />];
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    return icons[Math.abs(hash) % icons.length];
};

const BlueprintLink = ({ route, customIconCode }: { route: any, customIconCode?: string }) => {
    const buildPath = usePathBuilder();
    const { t } = useTranslation('arix/navigation');
    
    // Direct SVG Rendering
    const iconContent = customIconCode && customIconCode.trim() !== '' 
        ? <div className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full text-gray-300 group-hover:text-gray-100 transition-colors" dangerouslySetInnerHTML={{ __html: customIconCode }} />
        : renderBlueprintIcon(route);

    const inner = (
        <NavLink to={buildPath(route.path, true)} exact={route.exact} className='routers_link group'>
            <div className='routers_link_icon'>{iconContent}</div>
            <span className='routers_link_title'>{t(route.name) || route.name}</span>
        </NavLink>
    );
    return route.permission ? <Can action={route.permission} matchAny>{inner}</Can> : inner;
};

export const Navigation = () => {
    const links = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.links ?? {});
    
    // FETCHING THE JSON DIRECTLY FROM PUBLIC FOLDER
    const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
    useEffect(() => {
        fetch('/extension_icons.json?t=' + Date.now())
            .then((res) => res.json())
            .then((data) => setCustomIcons(data))
            .catch(() => setCustomIcons({}));
    }, []);

    const blueprintServerRoutes = useBlueprintServerRoutes();
    const sortedBlueprintRoutes = useMemo(() => {
        return [...blueprintServerRoutes].sort((a, b) => {
            const keyA = getRouteKey(a), keyB = getRouteKey(b);
            const getRank = (key: string) => {
                if (key.includes('plugin')) return 1;
                if (key.includes('mod')) return 2;
                if (key.includes('version')) return 3;
                if (key.includes('propert')) return 4;
                if (key.includes('player')) return 5;
                if (key.includes('world')) return 6;
                return 99;
            };
            const rankA = getRank(keyA), rankB = getRank(keyB);
            return rankA !== rankB ? rankA - rankB : keyA.localeCompare(keyB);
        });
    }, [blueprintServerRoutes]);

    return (
        <React.Fragment>
            {Object.values(links).map((category, index) => <Category key={index} {...category} />)}
            {sortedBlueprintRoutes.length > 0 && (
                <div className='routers_category-wrapper'>
                    <span className='routers_category'>Extensions</span>
                    <div className='routers_links'>
                        {sortedBlueprintRoutes.map((route) => (
                            <BlueprintLink key={route.path} route={route} customIconCode={customIcons[route.identifier]} />
                        ))}
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export const ComponentLoader = () => {
    const location = useLocation();
    const links = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.links ?? {});
    const dashboardPage = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.advanced?.dashboardPage ?? true);
    const { nestId, eggId, tier } = useServerIds();
    const buildPath = usePathBuilder();
    const blueprintServerRoutes = useBlueprintServerRoutes();

    const canShowWithTier = (routePath: string): boolean => {
        const link = Object.values(links ?? {}).flatMap((category) => category.links).find((link) => link.url === routePath);
        if (!link || !Array.isArray(link.tier) || link.tier.length === 0 || tier == null) return true;
        return link.tier.includes(tier);
    };

    return (
        <TransitionRouter>
            <Switch location={location}>
                {routes.server.map((route) => {
                    if (!shouldDisplayRoute(route, nestId, eggId) || (route.path === '/' && !dashboardPage)) return null;
                    const path = getAdjustedPath(route.path, !dashboardPage);
                    const Component = route.component;
                    return !canShowWithTier(path) ? <PremiumFeature key={path} /> : (
                        <PermissionRoute key={path} permission={route.permission} path={buildPath(path)} exact>
                            <Spinner.Suspense><Component /></Spinner.Suspense>
                        </PermissionRoute>
                    );
                })}
                {blueprintServerRoutes.map(({ path, permission, component: Component }) => (
                    <PermissionRoute key={path} permission={permission} path={buildPath(path)} exact>
                        <Spinner.Suspense><Component /></Spinner.Suspense>
                    </PermissionRoute>
                ))}
                <Route path={'*'} component={NotFound} />
            </Switch>
        </TransitionRouter>
    );
};
