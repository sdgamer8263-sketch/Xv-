import React, { useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import tw from 'twin.macro';
import { Button } from '@/components/elements/button/index';
import { SwitchVerticalIcon, InformationCircleIcon } from '@heroicons/react/outline';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';

export default () => {
    const { clearFlashes, addFlash } = useFlash();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const changeEgg = () => {
        clearFlashes('egg-changer');
        setIsSubmitting(true);
        
        // Backend API connect hone tak ka fake delay (Design testing ke liye)
        setTimeout(() => {
            addFlash({ key: 'egg-changer', type: 'success', message: 'Egg change request submitted! (Backend connection pending)' });
            setIsSubmitting(false);
        }, 1000);
    };

    return (
        <ServerContentBlock title={'Egg Changer'} icon={SwitchVerticalIcon}>
            <FlashMessageRender byKey={'egg-changer'} css={tw`mb-4`} />
            
            <div css={tw`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                <TitledGreyBox title={'Change Server Environment'} icon={SwitchVerticalIcon}>
                    <div css={tw`mb-6`}>
                        <p css={tw`text-sm text-neutral-300`}>
                            Select a new environment (Egg) for your server. <b css={tw`text-red-400`}>Warning:</b> Changing the egg might require a server reinstall and could affect your current files.
                        </p>
                    </div>
                    
                    <div css={tw`flex flex-col gap-4`}>
                        <div>
                            <label css={tw`mb-2 block text-sm font-medium text-neutral-200`}>Select New Egg</label>
                            <select css={tw`w-full p-3 bg-neutral-900 rounded border border-neutral-700 text-neutral-200 shadow-inner focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200`}>
                                <option value="1">Minecraft: Paper</option>
                                <option value="2">Minecraft: Forge</option>
                                <option value="3">Node.js App</option>
                                <option value="4">Python Bot</option>
                            </select>
                        </div>
                        
                        <div css={tw`mt-4 flex justify-end`}>
                            <Button color={'red'} disabled={isSubmitting} onClick={changeEgg}>
                                {isSubmitting ? 'Processing...' : 'Change Egg'}
                            </Button>
                        </div>
                    </div>
                </TitledGreyBox>

                <TitledGreyBox title={'Information'} icon={InformationCircleIcon}>
                    <div css={tw`flex flex-col gap-4 text-sm text-neutral-300`}>
                        <p>
                            <strong css={tw`text-neutral-100`}>What is an Egg?</strong><br/>
                            An Egg defines the environment your server runs in. It tells the panel which Docker image and startup scripts to use.
                        </p>
                        <p>
                            <strong css={tw`text-neutral-100`}>Will I lose my files?</strong><br/>
                            Changing the egg doesn't delete your files automatically, but if you reinstall the server for the new egg to take effect, some core files might be overwritten. Please take a backup!
                        </p>
                    </div>
                </TitledGreyBox>
            </div>
        </ServerContentBlock>
    );
};
