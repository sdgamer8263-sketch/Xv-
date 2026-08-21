import React, { useState, useEffect, ChangeEvent } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { useTranslation } from 'react-i18next';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Switch from '@/components/elements/Switch';
import Select from '@/components/elements/Select';
import updateAccountLanguage from '@/api/account/updateAccountLanguage';
import { Button } from '@/components/elements/button/index';
import { DesktopComputerIcon, EyeIcon, MoonIcon, SunIcon } from '@heroicons/react/outline';

const AppearanceWrapper = () => {
    const { i18n } = useTranslation('arix/account');
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

    const {
        modeToggler,
        defaultMode,
        langSwitch,
        languageOptions: languages,
    } = useStoreState((state: ApplicationStore) => state.settings.data!.arix.advanced);

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || defaultMode || 'dark');
    const [isCompact, setIsCompact] = useState(() => localStorage.getItem('compactMode') === 'true');
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true');
    const [panelSounds, setPanelSounds] = useState(() => localStorage.getItem('panelSounds') === 'true');
    const [animations, setAnimations] = useState(() => localStorage.getItem('animations') === 'true');

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.body.classList.remove('lightmode', 'darkmode', 'oled', 'auto');
        if (theme === 'light') {
            document.body.classList.add('lightmode');
        } else if (theme === 'oled') {
            document.body.classList.add('oled');
        } else if (theme === 'auto') {
            document.body.classList.add('auto');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('lightmode', !prefersDark);
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('compactMode', String(isCompact));
        document.body.classList.toggle('compact', isCompact);
    }, [isCompact]);

    useEffect(() => {
        localStorage.setItem('privacyMode', String(isPrivacyMode));
        document.body.classList.toggle('privacy', isPrivacyMode);
    }, [isPrivacyMode]);

    useEffect(() => {
        localStorage.setItem('panelSounds', String(panelSounds));
    }, [panelSounds]);

    useEffect(() => {
        localStorage.setItem('animations', String(animations));
        document.body.classList.toggle('animationsDisabled', animations);
    }, [animations]);

    const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = event.target.value;

        updateAccountLanguage(newLanguage).then(() => {
            i18n.changeLanguage(newLanguage);
            setSelectedLanguage(newLanguage);
        });
    };

    useEffect(() => {
        setSelectedLanguage(i18n.language || 'en');
    }, [i18n.language]);

    const ToggleRow = ({
        label,
        description,
        offLabel,
        onLabel,
        value,
        onToggle,
        name,
    }: {
        label: React.ReactNode;
        description: string;
        offLabel?: string;
        onLabel?: string;
        value: boolean;
        onToggle: (checked: boolean) => void;
        name: string;
    }) => (
        <div className={'flex justify-between items-center'}>
            <div>
                <p className={'text-gray-100 mb-1'}>{label}</p>
                <p className='text-sm text-gray-300'>{description}</p>
            </div>
            <div className={'flex gap-x-2 items-center'}>
                <span className={'text-sm text-gray-300'}>{offLabel ?? 'Off'}</span>
                <Switch name={name} onChange={() => onToggle(!value)} defaultChecked={value} />
                <span className={'text-sm text-gray-300'}>{onLabel ?? 'On'}</span>
            </div>
        </div>
    );

    return (
        <TitledGreyBox title={'Appearance'}>
            <div className='space-y-5'>
                {langSwitch && languages.length > 1 && (
                    <div className={'flex justify-between items-center'}>
                        <div className='flex-1'>
                            <p className={'text-gray-100 mb-1'}>Panel Language</p>
                            <p className='text-sm text-gray-300'>Use the panel in different languages</p>
                        </div>
                        <Select
                            value={selectedLanguage}
                            className={'!w-auto min-w-40 !pr-10'}
                            onChange={handleLanguageChange}
                        >
                            {languages.map((lang: { key: string; name: string }) => (
                                <option key={lang.key} value={lang.key}>
                                    {lang.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}
                {modeToggler && (
                    <div className={'flex justify-between items-center'}>
                        <div className='flex-1'>
                            <p className={'text-gray-100 mb-1'}>Light/Dark Mode</p>
                            <p className='text-sm text-gray-300'>Choose the style that suits you best</p>
                        </div>
                        <Button.Text
                            className={`flex gap-1 !rounded-r-none min-w-20 ${theme === 'light' ? '!bg-gray-500' : ''}`}
                            onClick={() => setTheme('light')}
                        >
                            <SunIcon className='w-5' />
                            Light
                        </Button.Text>
                        <Button.Text
                            className={`flex gap-1 !rounded-none min-w-20 ${
                                theme === 'darkmode' ? '!bg-gray-500' : ''
                            }`}
                            onClick={() => setTheme('darkmode')}
                        >
                            <MoonIcon className='w-5' />
                            Dark
                        </Button.Text>
                        <Button.Text
                            className={`flex gap-1 !rounded-none min-w-20 ${theme === 'oled' ? '!bg-gray-500' : ''}`}
                            onClick={() => setTheme('oled')}
                        >
                            <EyeIcon className='w-5' />
                            Oled
                        </Button.Text>
                        <Button.Text
                            className={`flex gap-1 !rounded-l-none min-w-20 ${theme === 'auto' ? '!bg-gray-500' : ''}`}
                            onClick={() => setTheme('auto')}
                        >
                            <DesktopComputerIcon className='w-5' />
                            Auto
                        </Button.Text>
                    </div>
                )}
                <ToggleRow
                    label={'Display Mode'}
                    description={'Toggle between normal and compact display modes'}
                    value={isCompact}
                    onToggle={setIsCompact}
                    onLabel={'Compact'}
                    offLabel={'Normal'}
                    name={'compact'}
                />
                <ToggleRow
                    label={'Panel Sounds'}
                    description={'Play a sound at crucial moments in the panel'}
                    value={panelSounds}
                    onToggle={setPanelSounds}
                    name={'panel-sounds'}
                />
                <ToggleRow
                    label={'Privacy Mode'}
                    description={'Hide sensitive information in the panel'}
                    value={isPrivacyMode}
                    onToggle={setIsPrivacyMode}
                    name={'privacy'}
                />
                <ToggleRow
                    label={'Animations'}
                    description={'Enable or disable animations in the panel'}
                    value={animations}
                    onToggle={setAnimations}
                    name={'animations'}
                />
            </div>
        </TitledGreyBox>
    );
};

export default AppearanceWrapper;
