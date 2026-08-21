import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useFlashKey } from '@/plugins/useFlash';
import http from '@/api/http';
import Spinner from '@/components/elements/Spinner';
import Select from '@/components/elements/Select';
import Input from '@/components/elements/Input';
import Alert from './Alert';
import styled from 'styled-components/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faList, faDownload, faCalendarAlt, faSort, faPuzzlePiece, faGamepad } from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import ModpackInstallModal from './ModpackInstallModal';
import Pagination from '@/components/elements/Pagination';
import { useLocation } from 'react-router';

const FilterContainer = styled.div`
    ${tw`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4`};
`;

const FilterGroup = styled.div`
    ${tw`relative flex items-center`};
`;

const FilterIcon = styled(FontAwesomeIcon)`
    ${tw`absolute left-3 text-neutral-400 pointer-events-none`};
`;

const StyledSelect = styled(Select)`
    ${tw`pl-10 w-full`};
    & > option {
        ${tw`flex items-center`};
    }
`;

const StyledInput = styled(Input)`
    ${tw`w-full`};
    &::placeholder {
        ${tw`text-neutral-400`};
    }
`;

const ModpackGrid = styled.div`
    ${tw`grid gap-4 md:grid-cols-2 lg:grid-cols-3`};
`;

const ModpackCard = styled.div`
    ${tw`bg-neutral-700 rounded-lg shadow-md transition-all duration-150 hover:shadow-lg border border-neutral-600 hover:border-neutral-500 cursor-pointer relative overflow-hidden`};
    &:hover {
        transform: translateY(-2px);
        ${tw`shadow-xl`};
        
        &::after {
            opacity: 0.1;
        }
    }
    
    &::after {
        content: '';
        ${tw`absolute inset-0 bg-white opacity-0 transition-opacity duration-150`};
    }
`;

const ModpackHeader = styled.div`
    ${tw`flex items-start gap-4 p-4 border-b border-neutral-600`};
`;

const ModpackIcon = styled.img`
    ${tw`w-16 h-16 rounded-lg object-cover bg-neutral-600 border-2 border-neutral-500`};
`;

const ModpackInfo = styled.div`
    ${tw`flex-1 min-w-0`};
`;

const ModpackDescription = styled.p`
    ${tw`mt-1 text-sm text-neutral-200 line-clamp-1`};
`;

const ModpackFooter = styled.div`
    ${tw`p-4 flex items-center justify-between`};
`;

const ModpackStats = styled.div`
    ${tw`text-xs text-neutral-300 flex items-center gap-4`};
`;

const StatItem = styled.span`
    ${tw`flex items-center gap-1`};
    svg {
        ${tw`text-neutral-400`};
    }
`;

const ModpackTag = styled.span`
    ${tw`px-2 py-1 text-xs bg-neutral-800 text-neutral-200 rounded-md`};
`;

interface Modpack {
    id: number;
    name: string;
    summary: string;
    author: string;
    thumbnailUrl: string;
    downloadCount: number;
    gameVersion: string;
    modLoader: string;
    fileDate?: string;
    dateModified?: string;
    dateCreated?: string;
    provider?: string;
}

interface FilterOption {
    value: string;
    label: string;
}

interface PaginationData {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
}

interface ModpackFile {
    id: number;
    displayName: string;
    fileName: string;
    downloadUrl: string;
    gameVersion: string;
    modLoader: string;
    fileLength: number;
    fileDate?: string;
}

const PAGE_SIZES = [
    { value: 12, label: '12 per page' },
    { value: 24, label: '24 per page' },
    { value: 48, label: '48 per page' },
];

const PROVIDERS = [
    { value: 'curseforge', label: 'CurseForge' },
    { value: 'modrinth', label: 'Modrinth' },
    { value: 'ftb', label: 'Feed The Beast' },
];

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'downloads', label: 'Downloads' },
    { value: 'updated', label: 'Last Update' },
];



const getModpackUpdateDate = (modpack: Modpack): string => {
    
    if (modpack.fileDate) return modpack.fileDate;
    
    if (modpack.dateModified) return modpack.dateModified;
    if (modpack.dateCreated) return modpack.dateCreated;
    
    return new Date().toISOString();
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

export default () => {
    const id = ServerContext.useStoreState(state => state.server.data!.id);
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('modpacks');
    
    
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const defaultProvider = params.get('provider') || 'curseforge';
    const defaultSearch = params.get('query') || '';
    const defaultPageSize = Number(params.get('perPage') || 12);
    const defaultPage = Number(params.get('page') || 1);
    
    
    const [provider, setProvider] = useState(defaultProvider);
    const [searchTerm, setSearchTerm] = useState(defaultSearch);
    const [perPage, setPerPage] = useState(!isNaN(defaultPageSize) && [12, 24, 48].includes(defaultPageSize) ? defaultPageSize : 24);
    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    
    
    const defaultLoader = params.get('loader') || '';
    const defaultVersion = params.get('version') || '';
    const defaultSort = params.get('sort') || 'relevance';
    
    const [loader, setLoader] = useState(defaultLoader);
    const [mcversion, setMcversion] = useState(defaultVersion);
    const [sortBy, setSortBy] = useState(defaultSort);
    
    
    const [loaderOptions, setLoaderOptions] = useState<FilterOption[]>([]);
    const [versionOptions, setVersionOptions] = useState<FilterOption[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [modpacks, setModpacks] = useState<Modpack[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        total: 0,
        count: 0,
        perPage: perPage,
        currentPage: page,
        totalPages: 1,
    });
    
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showModpackModal, setShowModpackModal] = useState(false);
    const [selectedModpack, setSelectedModpack] = useState<Modpack | null>(null);
    
    
    
    useEffect(() => {
        clearFlashes();
        loadFilterOptions();
    }, [provider]);
    
    
    useEffect(() => {
        clearFlashes();
        loadModpacks();
    }, [provider, perPage, page, searchTerm, loader, mcversion, sortBy]);
    
    
    const loadFilterOptions = () => {
        setLoadingFilters(true);
        setLoaderOptions([]);
        setVersionOptions([]);
        
        http.get(`/api/client/extensions/sagaminecraftmodpackinstaller/servers/${id}/modpacks/filters`, {
            params: {
                provider: provider,
            },
        })
            .then(({ data }) => {
                if (data.loaders) {
                    const loaders = data.loaders.map((item: string) => ({
                        value: item,
                        label: item,
                    }));
                    setLoaderOptions([{ value: '', label: 'All Loaders' }, ...loaders]);
                }
                
                if (data.versions) {
                    const versions = data.versions.map((item: string) => ({
                        value: item,
                        label: item,
                    }));
                    setVersionOptions([{ value: '', label: 'All Versions' }, ...versions]);
                }
                
                setLoadingFilters(false);
            })
            .catch(error => {
                console.error('Failed to load filter options:', error);
                setLoadingFilters(false);
            });
    };
    
    
    const loadModpacks = () => {
        setLoading(true);
        
        http.get(`/api/client/extensions/sagaminecraftmodpackinstaller/servers/${id}/modpacks`, {
            params: {
                query: searchTerm,
                perPage: perPage,
                page: page,
                provider: provider,
                loader: loader,
                gversion: mcversion,
                sort: sortBy,
            },
        })
            .then(({ data }) => {
                const modpacksWithProvider = data.items.map((modpack: Modpack) => ({
                    ...modpack,
                    provider: provider,
                }));
                
                // Tidak melakukan sorting tambahan di frontend untuk menghormati parameter sort dari API
                setModpacks(modpacksWithProvider);
                setPagination(data.pagination);
                setLoading(false);
            })
            .catch(error => {
                setErrorMessage(error.message || 'Failed to load modpacks');
                setLoading(false);
            });
    };
    
    const onPageSelect = (newPage: number) => {
        setPage(newPage);
    };
    
    
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const selectModpack = (modpack: Modpack) => {
        setSelectedModpack(modpack);
        setShowModpackModal(true);
    };

    return (
        <ServerContentBlock showFlashKey={'modpacks'} title={'Modpacks'}>
            {successMessage && (
                <Alert type="success">
                    {successMessage}
                </Alert>
            )}
            {errorMessage && (
                <Alert type="danger">
                    {errorMessage}
                </Alert>
            )}
            <FilterContainer>
                <FilterGroup>
                    <FilterIcon icon={faLayerGroup} />
                    <StyledSelect
                        value={provider}
                        onChange={e => {
                            setProvider(e.target.value);
                            setLoader(''); 
                            setMcversion(''); 
                            setSortBy('relevance'); 
                            setSearchTerm('');
                            setPage(1);
                        }}
                    >
                        {PROVIDERS.map(providerOption => (
                            <option key={providerOption.value} value={providerOption.value}>{providerOption.label}</option>
                        ))}
                    </StyledSelect>
                </FilterGroup>
                
                <FilterGroup>
                    <FilterIcon icon={faList} />
                    <StyledSelect
                        value={perPage.toString()}
                        onChange={e => {
                            setPerPage(parseInt(e.target.value));
                            setPage(1);
                        }}
                    >
                        {PAGE_SIZES.map(size => (
                            <option key={size.value} value={size.value}>{size.label}</option>
                        ))}
                    </StyledSelect>
                </FilterGroup>
                
                <FilterGroup>
                    <FilterIcon icon={faGamepad} />
                    <StyledSelect
                        value={mcversion}
                        onChange={e => {
                            setMcversion(e.target.value);
                            setPage(1);
                        }}
                        disabled={loadingFilters || versionOptions.length === 0}
                    >
                        {versionOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </StyledSelect>
                </FilterGroup>
                
                <FilterGroup>
                    <FilterIcon icon={faPuzzlePiece} />
                    <StyledSelect
                        value={loader}
                        onChange={e => {
                            setLoader(e.target.value);
                            setPage(1);
                        }}
                        disabled={loadingFilters || loaderOptions.length === 0}
                    >
                        {loaderOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </StyledSelect>
                </FilterGroup>
                
                <FilterGroup>
                    <FilterIcon icon={faSort} />
                    <StyledSelect
                        value={sortBy}
                        onChange={e => {
                            setSortBy(e.target.value);
                            setPage(1);
                        }}
                    >
                        {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </StyledSelect>
                </FilterGroup>
                
                <FilterGroup>
                    <StyledInput
                        placeholder="Search modpacks..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </FilterGroup>
            </FilterContainer>

            {loading ? (
                <Spinner size="large" centered />
            ) : (
                <Pagination data={{ items: modpacks, pagination }} onPageSelect={onPageSelect}>
                    {({ items }) => (
                        <ModpackGrid>
                            {items.length > 0 ? (
                                items.map(modpack => (
                                    <ModpackCard
                                        key={modpack.id}
                                        onClick={() => selectModpack(modpack)}
                                    >
                                        <ModpackHeader>
                                            {modpack.thumbnailUrl ? (
                                                <ModpackIcon
                                                    src={modpack.thumbnailUrl}
                                                    alt={`${modpack.name} icon`}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div css={tw`w-16 h-16 rounded-lg bg-neutral-600 border-2 border-neutral-500 flex items-center justify-center text-neutral-300`}>
                                                    <FontAwesomeIcon icon={faLayerGroup} size="lg" />
                                                </div>
                                            )}
                                            <ModpackInfo>
                                                <div css={tw`flex-1 mr-4`}>
                                                    <div css={tw`flex items-center text-sm mb-1`}>
                                                        <span css={tw`font-semibold line-clamp-1`}>
                                                            {modpack.name}
                                                        </span>
                                                    </div>
                                                    <p css={tw`text-sm text-neutral-300`}>
                                                        By {modpack.author}
                                                    </p>
                                                </div>
                                                <ModpackDescription>
                                                    {modpack.summary}
                                                </ModpackDescription>
                                            </ModpackInfo>
                                        </ModpackHeader>
                                        <ModpackFooter>
                                            <ModpackStats>
                                                <StatItem>
                                                    <FontAwesomeIcon icon={faDownload} />
                                                    {formatNumber(modpack.downloadCount)}
                                                </StatItem>
                                                <StatItem>
                                                    <FontAwesomeIcon icon={faCalendarAlt} />
                                                    Updated {formatDistanceToNow(new Date(getModpackUpdateDate(modpack)), { addSuffix: true })}
                                                </StatItem>
                                            </ModpackStats>
                                        </ModpackFooter>
                                    </ModpackCard>
                                ))
                            ) : (
                                <p css={tw`text-center text-sm text-neutral-300 col-span-3`}>
                                    No modpacks found matching your search criteria.
                                </p>
                            )}
                        </ModpackGrid>
                    )}
                </Pagination>
            )}

            {selectedModpack && (
                <ModpackInstallModal
                    modpack={selectedModpack}
                    open={showModpackModal}
                    onClose={() => {
                        setShowModpackModal(false);
                        setSelectedModpack(null);
                    }}
                />
            )}
        </ServerContentBlock>
    );
};
