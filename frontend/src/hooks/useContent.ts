import { useQuery } from '@tanstack/react-query'; import { api } from '../api/client'; import type { ApiResponse, Article, Club, Match } from '../types';
const read = <T>(url: string) => api.get<ApiResponse<T>>(url).then(response => response.data.data);
export const useArticles = (params = '') => useQuery({ queryKey: ['articles', params], queryFn: () => read<Article[]>(`/articles${params}`) });
export const useTrending = () => useQuery({ queryKey: ['articles', 'trending'], queryFn: () => read<Article[]>('/articles/trending') });
export const useArticle = (slug: string) => useQuery({ queryKey: ['article', slug], queryFn: () => read<Article>(`/articles/${slug}`), enabled: Boolean(slug) });
export const useMatches = () => useQuery({ queryKey: ['matches'], queryFn: () => read<Match[]>('/matches?limit=20') });
export const useClubs = () => useQuery({ queryKey: ['clubs'], queryFn: () => read<Club[]>('/clubs?limit=20') });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => read<{ id: number; name: string; slug: string }[]>('/categories') });
export const useTransfers = () => useQuery({ queryKey: ['transfers'], queryFn: () => read<unknown[]>('/transfers?limit=20') });
