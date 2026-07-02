import { api } from './axios';
import type { ApiEnvelope, Movie } from '@/types';

export interface CreateMovieInput {
  title: string;
  description?: string;
  url?: string;
  movieFile?: File;
  thumbnailFile?: File;
  subtitleFile?: File;
  onProgress?: (percent: number) => void;
}

export const movieApi = {
  listMine: () => api.get<ApiEnvelope<{ movies: Movie[] }>>('/movies').then((r) => r.data),

  create: ({ onProgress, ...input }: CreateMovieInput) => {
    const form = new FormData();
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.url) form.append('url', input.url);
    if (input.movieFile) form.append('movie', input.movieFile);
    if (input.thumbnailFile) form.append('thumbnail', input.thumbnailFile);
    if (input.subtitleFile) form.append('subtitle', input.subtitleFile);

    return api
      .post<ApiEnvelope<{ movie: Movie }>>('/movies', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  remove: (movieId: string) =>
    api.delete<ApiEnvelope<null>>(`/movies/${movieId}`).then((r) => r.data),
};
