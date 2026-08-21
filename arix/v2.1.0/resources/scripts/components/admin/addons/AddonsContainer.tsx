import React, { useState } from 'react';
import EditorWrapper from '../elements/EditorWrapper';
import { Button, styles } from '@/components/elements/button/index';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Badge from '@/components/elements/Badge';
import {
    AdjustmentsIcon,
    BanIcon,
    BeakerIcon,
    CloudDownloadIcon,
    CogIcon,
    CollectionIcon,
    DocumentDownloadIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    LibraryIcon,
    LinkIcon,
    MapIcon,
    PhotographIcon,
    PuzzleIcon,
    ShieldExclamationIcon,
} from '@heroicons/react/outline';
import classNames from 'classnames';

const Addons = [
    {
        icon: DocumentDownloadIcon,
        name: 'Plugin Installer',
        game: 'minecraft',
        description: 'Easily install plugins for your servers with a single click.',
    },
    {
        icon: CollectionIcon,
        name: 'Version Changer',
        game: 'minecraft',
        description: 'Easily change the version of your servers with a single click.',
    },
    {
        icon: PhotographIcon,
        name: 'Icon Changer',
        game: 'minecraft',
        description: 'Easily change the icons of your servers with a single click.',
    },
    {
        icon: BeakerIcon,
        name: 'Mods Installer',
        game: 'minecraft',
        description: 'Easily install mods for your servers with a single click.',
    },
    {
        icon: MapIcon,
        name: 'World Installer',
        game: 'minecraft',
        description: 'Easily install worlds for your servers with a single click.',
    },
    {
        icon: BeakerIcon,
        name: 'Mods Installer',
        game: 'hytale',
        description: 'Easily install mods for your servers with a single click.',
    },
    {
        icon: LibraryIcon,
        name: 'Prefabs Installer',
        game: 'hytale',
        description: 'Easily install prefabs for your servers with a single click.',
    },
    {
        icon: GlobeAltIcon,
        name: 'Subdomain Manager',
        game: 'all',
        description: 'Easily manage subdomains for your servers with a single click.',
    },
    {
        icon: ShieldExclamationIcon,
        name: 'Ratelimit Editor',
        game: 'all',
        description: 'Easily manage ratelimits for your servers with a single click.',
    },
    {
        icon: DocumentTextIcon,
        name: 'Config Editor',
        game: 'all',
        description: 'Easily edit the configuration files of your servers with a single click.',
    },
    {
        icon: AdjustmentsIcon,
        name: 'Startup Editor',
        game: 'all',
        description: 'Easily edit the configuration files of your servers with a single click.',
    },
    {
        icon: AdjustmentsIcon,
        name: 'Egg Changer',
        game: 'all',
        description: 'Easily edit the configuration files of your servers with a single click.',
    },
    {
        icon: CloudDownloadIcon,
        name: 'Egg Importer',
        game: 'all',
        description: 'Easily import eggs for your panel with a single click.',
    },
    {
        icon: BanIcon,
        name: 'Auto Suspend',
        game: 'all',
        description: 'Easily edit the configuration files of your servers with a single click.',
    },
    {
        icon: PuzzleIcon,
        name: 'FiveM Utils',
        game: 'fivem',
        description: 'Easily manage your FiveM servers with these useful utilities.',
    },
    {
        icon: CollectionIcon,
        name: 'Artifact Changer',
        game: 'fivem',
        description: 'Easily edit the configuration files of your servers with a single click.',
    },
];

export default () => {
    const [search, setSearch] = useState('');

    return (
        <EditorWrapper title='Addons Configuration'>
            <div className='px-6 space-y-4'>
                <div>
                    <Label htmlFor='search'>Search for addons</Label>
                    <Input
                        id={'search'}
                        placeholder='Search for addons...'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {Addons.filter((addon) => addon.name.toLowerCase().includes(search.toLowerCase())).map((addon) => (
                    <div className='bg-gray-600 boxBorder rounded-box'>
                        <div className='px-4 py-3 border-b border-gray-500'>
                            <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center gap-x-1'>
                                    {addon.icon && <addon.icon className='w-5 h-5 text-gray-300' />}
                                    <h3 className='text-lg font-medium text-gray-100'>{addon.name}</h3>
                                </div>
                                <Badge className='text-sm' color='danger'>
                                    Disabled
                                </Badge>
                            </div>
                            <p>{addon.description}</p>
                        </div>
                        <div className='flex items-center justify-between px-4 py-3'>
                            <span className='py-1 px-2 rounded bg-gray-500 capitalize text-sm'>{addon.game}</span>
                            <Button.Text size={Button.Sizes.Small} disabled>
                                <CogIcon className='w-4 h-4 mr-2' />
                                Settings
                            </Button.Text>
                        </div>
                    </div>
                ))}
                <a
                    href={'https://arix.gg/community'}
                    target={'_blank'}
                    className='block border border-gray-500 px-4 py-3 border-dashed rounded-box hover:bg-gray-600 duration-300'
                >
                    <h3 className='text-lg font-medium text-gray-100'>Missing Anything?</h3>
                    <p className='mt-1'>If there is an addon you would like to see, please let us know!</p>

                    <div
                        className={classNames(
                            styles.button,
                            styles.text,
                            styles.secondary,
                            'mt-4 flex items-center gap-1 w-full'
                        )}
                    >
                        <LinkIcon className='w-4 h-4' />
                        Join our community
                    </div>
                </a>
            </div>
            <div className='mt-auto sticky bottom-0 px-6 pb-5 bg-gray-700 z-20'>
                <div className='absolute bottom-full left-0 w-full h-[40vh] bg-gradient-to-b from-transparent to-gray-700 pointer-events-none' />
                <div className='absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-b from-transparent to-arix/40 pointer-events-none' />
                <p className='text-center text-sm mb-2 font-medium relative z-1 text-white opacity-50'>
                    Unlock all addons for $49,95
                </p>
                <a
                    href='https://arix.gg/pterodactyl-addons'
                    className={classNames(styles.button, styles.primary, 'w-full relative z-10')}
                >
                    Purchase now!
                </a>
            </div>
        </EditorWrapper>
    );
};
