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

// --- BLUEPRINT IMPORTS ---
import blueprintRoutes from '@blueprint/extends/routers/routes';
import { HiOutlineAdjustments, HiAdjustments } from 'react-icons/hi';
import { LuSlidersVertical } from 'react-icons/lu';
import { RiSoundModuleLine, RiSoundModuleFill } from 'react-icons/ri';

const ICON_MAP: Record<string, number> = {
    heroicons: 0,
    heroiconsFilled: 1,
    lucide: 2,
    remixicon: 3,
    remixiconFilled: 4,
};
// -------------------------

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

const getAdjustedPath = (path: string, isDashboardDisabled: boolean) =>
    path === '/console' && isDashboardDisabled ? '/' : path;

const Link = (props: LinkItem) => {
    const { t } = useTranslation('arix/navigation');
    const { nestId, eggId, tier } = useServerIds();
    const tierVisibility = useStoreState(
        (state: ApplicationStore) => state.settings.data?.arix?.advanced?.tierVisibility ?? 'show'
    );

    const permissions = (props.permission ?? []).filter((permission) => permission && permission.trim().length > 0);
    const hasPermissions = permissions.length > 0;

    const hasNestRestrictions = Array.isArray(props.nests) && props.nests.length > 0;
    const hasEggRestrictions = Array.isArray(props.eggs) && props.eggs.length > 0;
    const hasTierRestrictions = Array.isArray(props.tier) && props.tier.length > 0;

    const nestMatches = hasNestRestrictions && typeof nestId === 'number' && props.nests?.includes(nestId) === true;
    const eggMatches = hasEggRestrictions && typeof eggId === 'number' && props.eggs?.includes(eggId) === true;
    const tierMatches =
        hasTierRestrictions && tier !== null && tier !== undefined && props.tier?.includes(tier) === true;

    const hasRestrictions = hasNestRestrictions || hasEggRestrictions || hasTierRestrictions;

    const showStar =
        hasTierRestrictions && tier !== null && tier !== undefined && !tierMatches && tierVisibility === 'show';
    const shouldHide =
        hasTierRestrictions && tier !== null && tier !== undefined && !tierMatches && tierVisibility === 'hidden';

    const buildPath = usePathBuilder();

    if (hasRestrictions && !nestMatches && !eggMatches && shouldHide) {
        return null;
    }

    const starIcon = showStar ? <StarIcon className='w-3 text-yellow-500' /> : null;

    const linkContent = (
        <>
            <div className='routers_link_icon'>
                <Icon name={props.icon} size='1.25rem' />
            </div>
            <span className='routers_link_title'>{t(props.name)}</span>
            {starIcon}
        </>
    );

    const inner = props.url.includes('http') ? (
        <div className='relative'>
            <a key={props.name} href={props.url} target='_blank' rel='noreferrer' className='routers_link'>
                {linkContent}
            </a>
        </div>
    ) : (
        <div className='relative'>
            <NavLink
                key={props.name}
                to={buildPath(props.url, true)}
                exact={props.url === '/'}
                className='routers_link'
            >
                {linkContent}
            </NavLink>
        </div>
    );

    return hasPermissions ? (
        <Can action={permissions} matchAny>
            {inner}
        </Can>
    ) : (
        inner
    );
};

const Category = (props: LinkCategory) => {
    const { t } = useTranslation('arix/navigation');
    const { nestId, eggId } = useServerIds();
    const permissions = (props.permission ?? []).filter((permission) => permission && permission.trim().length > 0);
    const hasPermissions = permissions.length > 0;
    const hasNestRestrictions = Array.isArray(props.nests) && props.nests.length > 0;
    const hasEggRestrictions = Array.isArray(props.eggs) && props.eggs.length > 0;
    const nestMatches = hasNestRestrictions && typeof nestId === 'number' && props.nests?.includes(nestId) === true;
    const eggMatches = hasEggRestrictions && typeof eggId === 'number' && props.eggs?.includes(eggId) === true;
    const hasRestrictions = hasNestRestrictions || hasEggRestrictions;

    if (hasRestrictions && !nestMatches && !eggMatches) {
        return null;
    }

    return hasPermissions ? (
        <Can action={permissions} matchAny>
            <div key={props.name} className='routers_category-wrapper'>
                <span className='routers_category'>{t(props.name)}</span>
                <div className='routers_links'>
                    {props.links.map((link) => (
                        <Link key={link.name} {...link} />
                    ))}
                </div>
            </div>
        </Can>
    ) : (
        <div className='routers_category-wrapper'>
            <span className='routers_category'>{t(props.name)}</span>
            <div className='routers_links'>
                {props.links.map((link) => (
                    <Link key={link.name} {...link} />
                ))}
            </div>
        </div>
    );
};

// --- BLUEPRINT LOGIC INJECTION ---
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
                } catch (e) {
                    newEggs[id] = ['-1'];
                }
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

const renderBlueprintIcon = (route: any, iconType: string) => {
    const iconIndex = ICON_MAP[iconType] ?? 0;
    let IconComponent = null;
    if (route.icon) {
        if (Array.isArray(route.icon)) {
            IconComponent = route.icon[iconIndex];
        } else {
            IconComponent = route.icon;
        }
    } else {
        const DEFAULT_ICON = [HiOutlineAdjustments, HiAdjustments, LuSlidersVertical, RiSoundModuleLine, RiSoundModuleFill];
        IconComponent = DEFAULT_ICON[iconIndex];
    }
    return IconComponent ? <IconComponent size="1.25rem" /> : null;
};

const BlueprintLink = ({ route }: { route: any }) => {
    const buildPath = usePathBuilder();
    const iconType = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.icon ?? 'heroicons');
    const { t } = useTranslation('arix/navigation');
    
    const inner = (
        <NavLink
            to={buildPath(route.path, true)}
            exact={route.exact}
            className='routers_link'
        >
            <div className='routers_link_icon'>
                {renderBlueprintIcon(route, iconType)}
            </div>
            <span className='routers_link_title'>{t(route.name) || route.name}</span>
        </NavLink>
    );

    return route.permission ? (
        <Can action={route.permission} matchAny>
            {inner}
        </Can>
    ) : inner;
};
// ---------------------------------

export const Navigation = () => {
    const links = useStoreState((state: ApplicationStore) => state.settings.data?.arix?.links ?? {});
    const blueprintServerRoutes = useBlueprintServerRoutes();

    return (
        <React.Fragment>
            {Object.values(links).map((category, index) => (
                <Category key={index} {...category} />
            ))}

            {/* BLUEPRINT EXTENSIONS MENU */}
            {blueprintServerRoutes.length > 0 && (
                <div className='routers_category-wrapper'>
                    <span className='routers_category'>Extensions</span>
                    <div className='routers_links'>
                        {blueprintServerRoutes.map((route) => (
                            <BlueprintLink key={route.path} route={route} />
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
        const link = Object.values(links ?? {})
            .flatMap((category) => category.links)
            .find((link) => link.url === routePath);

        if (!link) return true;
        if (!Array.isArray(link.tier) || link.tier.length === 0) return true;
        if (tier == null) return true;

        return link.tier.includes(tier);
    };

    return (
        <TransitionRouter>
            <Switch location={location}>
                {routes.server.map((route) => {
                    if (!shouldDisplayRoute(route, nestId, eggId)) return null;
                    if (route.path === '/' && !dashboardPage) return null;

                    const path = getAdjustedPath(route.path, !dashboardPage);
                    const Component = route.component;

                    if (!canShowWithTier(path)) return <PremiumFeature />;

                    return (
                        <PermissionRoute key={path} permission={route.permission} path={buildPath(path)} exact>
                            <Spinner.Suspense>
                                <Component />
                            </Spinner.Suspense>
                        </PermissionRoute>
                    );
                })}

                {/* BLUEPRINT COMPONENTS ROUTES */}
                {blueprintServerRoutes.map(({ path, permission, component: Component }) => (
                    <PermissionRoute key={path} permission={permission} path={buildPath(path)} exact>
                        <Spinner.Suspense>
                            <Component />
                        </Spinner.Suspense>
                    </PermissionRoute>
                ))}

                <Route path={'*'} component={NotFound} />
            </Switch>
        </TransitionRouter>
    );
};
