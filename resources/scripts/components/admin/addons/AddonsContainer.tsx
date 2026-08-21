import React, { useEffect, useState } from 'react';
import { Formik, useFormikContext } from 'formik';
import EditorWrapper from '../elements/EditorWrapper';
import BorderedBox from '../elements/BorderedBox';
import { Button } from '@/components/elements/button/index';
import getGeneral, { updateGeneral } from '@/api/admin/General';
import Spinner from '@/components/elements/Spinner';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { httpErrorToHuman } from '@/api/http';
import BlueprintRouter from '@/blueprint/extends/routers/routes';

const SvgInput = ({ ext }: { ext: any }) => {
    const { values, handleChange } = useFormikContext<any>();
    const fieldName = `icon_${ext.identifier}`;
    return (
        <div className='flex flex-col gap-1'>
            <label className='text-xs font-semibold text-gray-300 uppercase'>SVG Code</label>
            <textarea
                id={fieldName}
                name={fieldName}
                value={values[fieldName] || ''}
                onChange={handleChange}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-3 text-sm text-neutral-200 outline-none focus:border-blue-500 transition-colors resize-y"
                rows={4}
                placeholder='Paste <svg>...</svg> code here'
            />
        </div>
    );
};

export default () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const { clearFlashes, addFlash } = useFlash();

    const installedExtensions = BlueprintRouter?.server || (BlueprintRouter as any)?.default?.server || [];

    useEffect(() => {
        clearFlashes();
        getGeneral().then((data) => { setData(data); setIsLoading(false); })
        .catch((error) => { clearFlashes(); addFlash({ type: 'error', message: httpErrorToHuman(error) }); setIsLoading(false); });
    }, []);

    const handleSubmit = (values: any) => {
        clearFlashes();
        const iconsObj: any = {};
        installedExtensions.forEach((ext: any) => {
            let val = values[`icon_${ext.identifier}`] || '';
            val = val.replace(/\r?\n|\r/g, ''); // Removes newlines automatically
            iconsObj[ext.identifier] = val;
        });
        
        const payload: any = { ...data, extension_icons: JSON.stringify(iconsObj) };
        return updateGeneral(payload).then((updated) => {
            setData(updated ?? payload);
            addFlash({ type: 'success', message: 'SVG Icons saved successfully!' });
        }).catch((error) => { addFlash({ type: 'error', message: httpErrorToHuman(error) }); });
    };

    let initialValues: any = {};
    if (data) {
        const savedIcons = JSON.parse(data.extension_icons || '{}');
        installedExtensions.forEach((ext: any) => { initialValues[`icon_${ext.identifier}`] = savedIcons[ext.identifier] || ''; });
    }

    return (
        <EditorWrapper title='Extension & Blueprint Settings'>
            <FlashMessageRender />
            {isLoading || !data ? ( <Spinner size='large' centered /> ) : (
                <Formik initialValues={initialValues} enableReinitialize onSubmit={handleSubmit}>
                    {({ isSubmitting, submitForm }) => (
                        <React.Fragment>
                            <BorderedBox title='Auto-Detected Extensions' description={`System detected ${installedExtensions.length} installed blueprints. Paste the raw SVG code for each icon.`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {installedExtensions.map((ext: any, i: number) => (
                                        <div key={i} className='bg-gray-800 p-4 rounded-lg flex flex-col gap-2'>
                                            <h3 className='text-sm font-semibold text-gray-200'>{ext.name || ext.identifier}</h3>
                                            <SvgInput ext={ext} />
                                            <p className='text-xs text-gray-400'>Path: {ext.path}</p>
                                        </div>
                                    ))}
                                </div>
                            </BorderedBox>
                            <div className='mt-auto sticky bottom-0 px-6 pb-5 bg-gray-700 z-20'>
                                <Button className='w-full' onClick={submitForm} disabled={isSubmitting}>
                                    Save Icons {isSubmitting && <Spinner size='small' className='ml-2' />}
                                </Button>
                            </div>
                        </React.Fragment>
                    )}
                </Formik>
            )}
        </EditorWrapper>
    );
};
