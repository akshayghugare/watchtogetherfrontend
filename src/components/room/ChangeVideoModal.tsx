import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { movieApi } from '@/api/movie.api';
import { roomApi } from '@/api/room.api';
import { getErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Movie } from '@/types';

interface Props {
  roomId: string;
  onClose: () => void;
  onChanged: () => void;
}

/** Host-only: swap the video of a live room (existing movie, new upload, or URL). */
export function ChangeVideoModal({ roomId, onClose, onChanged }: Props) {
  const [myMovies, setMyMovies] = useState<Movie[]>([]);
  const [movieMode, setMovieMode] = useState<'existing' | 'upload' | 'url'>('url');
  const [movieId, setMovieId] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [movieUrl, setMovieUrl] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    movieApi
      .listMine()
      .then((res) => setMyMovies(res.data.movies))
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      let selectedMovieId = movieId;

      if (movieMode === 'upload') {
        if (!movieFile || !movieTitle.trim()) {
          toast.error('Choose a video file and give it a title.');
          setSubmitting(false);
          return;
        }
        setUploadPercent(0);
        const res = await movieApi.create({
          title: movieTitle.trim(),
          movieFile,
          onProgress: setUploadPercent,
        });
        selectedMovieId = res.data.movie.id;
      } else if (movieMode === 'url') {
        if (!movieUrl.trim() || !movieTitle.trim()) {
          toast.error('Provide a stream URL and a title.');
          setSubmitting(false);
          return;
        }
        const res = await movieApi.create({ title: movieTitle.trim(), url: movieUrl.trim() });
        selectedMovieId = res.data.movie.id;
      }

      if (!selectedMovieId) {
        toast.error('Pick or add a video first.');
        setSubmitting(false);
        return;
      }

      await roomApi.changeMovie(roomId, selectedMovieId);
      toast.success('Video changed for everyone 🎬');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
      setUploadPercent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-surface-raised p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Change the video</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Everyone in the room switches instantly; playback restarts from the beginning.
        </p>

        <div className="mt-5 space-y-4">
          <div className="flex gap-2">
            {(['existing', 'upload', 'url'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMovieMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  movieMode === m
                    ? 'bg-brand-600 text-white'
                    : 'border border-surface-border text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'existing' ? 'My movies' : m === 'upload' ? 'Upload file' : 'YouTube / URL'}
              </button>
            ))}
          </div>

          {movieMode === 'existing' && (
            <select
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              className="input-field"
            >
              <option value="">— Select a movie —</option>
              {myMovies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          {movieMode !== 'existing' && (
            <Input
              label="Movie title"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="Avengers: Endgame"
            />
          )}

          {movieMode === 'upload' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Video file (MP4 / WEBM / MKV / MOV)
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/x-matroska,video/quicktime,.mkv,.mov"
                  onChange={(e) => setMovieFile(e.target.files?.[0] ?? null)}
                  className="mt-1.5 block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-500"
                />
              </div>
              {uploadPercent !== null && (
                <div className="h-2 overflow-hidden rounded-full bg-surface-overlay">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {movieMode === 'url' && (
            <Input
              label="YouTube or stream URL"
              value={movieUrl}
              onChange={(e) => setMovieUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… or https://…/movie.mp4"
            />
          )}

          <Button onClick={submit} isLoading={submitting} className="w-full">
            {uploadPercent !== null ? `Uploading… ${uploadPercent}%` : 'Change video for everyone'}
          </Button>
        </div>
      </div>
    </div>
  );
}
