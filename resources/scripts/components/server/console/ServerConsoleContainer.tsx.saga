import React, { memo } from 'react';
import { ApplicationStore } from '@/state';
import { useStoreState } from 'easy-peasy';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import StatGraphs from '@/components/server/console/StatGraphs';
import SideGraphs from '@/components/server/console/SideGraphs';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import ServerDetailsBlock from '@/components/server/console/ServerDetailsBlock';
import { Alert } from '@/components/elements/alert';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import styled from 'styled-components/macro';
import tw from 'twin.macro';

const ExpirationBadge = styled.span`
    ${tw`ml-2 text-sm bg-neutral-600 text-gray-100 py-1 px-2 rounded-full inline-flex items-center transition-colors duration-150`};
    &:hover {
        ${tw`cursor-pointer`};
    }
`;
import { TerminalIcon } from '@heroicons/react/outline';
import { useTranslation } from 'react-i18next';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const ServerConsoleContainer = () => {
    const { t } = useTranslation('arix/server/console');
    const { sideGraphs, statsCards, graphs } = useStoreState(
        (state: ApplicationStore) => state.settings.data!.arix.components
    );
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const eggFeatures = ServerContext.useStoreState((state) => state.server.data!.eggFeatures, isEqual);
    const isNodeUnderMaintenance = ServerContext.useStoreState((state) => state.server.data!.isNodeUnderMaintenance);
    const expirationDate = ServerContext.useStoreState((state) => state.server.data!.expiration_date);

    return (
        <ServerContentBlock title={t('console')} icon={TerminalIcon}>
            {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                <Alert type={'warning'} className={'mb-4'}>
                    {isNodeUnderMaintenance
                        ? t('node-under-maintenance')
                        : isInstalling
                        ? t('running-installation-process')
                        : t('being-transferred')}
                </Alert>
            )}
            {statsCards == 2 && (
                <div className={'mb-4'}>
                    <ServerDetailsBlock />
                </div>
            )}
            {graphs == 2 && (
                <div className={'grid lg:grid-cols-3 gap-4 mb-4'}>
                    <StatGraphs />
                </div>
            )}

            <div className={'lg:grid grid-cols-3 flex flex-col gap-4'}>
                {sideGraphs == 3 && (
                    <div className={'flex flex-col gap-4'}>
                        <SideGraphs />
                    </div>
                )}
                <div className={sideGraphs == 1 ? 'lg:col-span-3' : 'lg:col-span-2'}>
                    <Spinner.Suspense>
                        <Console />
                    </Spinner.Suspense>
                </div>
                {sideGraphs == 2 && (
                    <div className={'flex flex-col gap-4'}>
                        <SideGraphs />
                    </div>
                )}
            </div>

            {statsCards == 3 && (
                <div className={'mt-4'}>
                    <ServerDetailsBlock />
                </div>
            )}

            {graphs == 3 && (
                <div className={'grid lg:grid-cols-3 gap-4 mt-4'}>
                    <StatGraphs />
                </div>
            )}
            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

export default memo(ServerConsoleContainer, isEqual);
