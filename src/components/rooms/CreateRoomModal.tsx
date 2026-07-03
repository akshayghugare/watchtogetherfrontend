import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { movieApi } from '@/api/movie.api';
import { roomApi } from '@/api/room.api';
import { friendApi } from '@/api/friend.api';
import { getErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { watchPath } from '@/constants';
import type { Movie, PublicUser } from '@/types';

interface Props {
  onClose: () => void;
}

export function CreateRoomModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [myMovies, setMyMovies] = useState<Movie[]>([]);

  // Room fields
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [password, setPassword] = useState('');
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  // Movie source: existing, upload, or URL
  const [movieMode, setMovieMode] = useState<'existing' | 'upload' | 'url'>('upload');
  const [movieId, setMovieId] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [movieUrl, setMovieUrl] = useState('');

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    movieApi
      .listMine()
      .then((res) => {
        setMyMovies(res.data.movies);
        if (res.data.movies.length > 0) setMovieMode('existing');
      })
      .catch(() => undefined);
    friendApi
      .list()
      .then((res) => setFriends(res.data.friends))
      .catch(() => undefined);
  }, []);

  const toggleInvite = (friendId: string) => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Room name is required.');
      return;
    }
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
          thumbnailFile: thumbnailFile ?? undefined,
          subtitleFile: subtitleFile ?? undefined,
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
        toast.error('Pick or upload a movie.');
        setSubmitting(false);
        return;
      }

      const roomRes = await roomApi.create({
        name: name.trim(),
        movieId: selectedMovieId,
        privacy,
        password: password || undefined,
        invitedUserIds: invitedIds.size > 0 ? [...invitedIds] : undefined,
      });
      toast.success('Room created — your friends have been notified! 🎬');
      onClose();
      navigate(watchPath(roomRes.data.room.id));
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
          <h2 className="text-lg font-bold text-white">Create a movie room</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Input
            label="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday movie night"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300">Movie</label>
            <div className="mt-1.5 flex gap-2">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400">Thumbnail (optional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">Subtitles .srt/.vtt (optional)</label>
                  <input
                    type="file"
                    accept=".srt,.vtt"
                    onChange={(e) => setSubtitleFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs text-gray-500"
                  />
                </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">Privacy</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as 'PUBLIC' | 'PRIVATE')}
                className="input-field mt-1.5"
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private (invited friends only)</option>
              </select>
            </div>
            <Input
              label="Password (optional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 4 chars"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Invite friends {privacy === 'PRIVATE' && <span className="text-gray-500">(only they can see &amp; join)</span>}
            </label>
            {friends.length === 0 ? (
              <p className="mt-1.5 text-xs text-gray-600">
                No friends yet — add friends to invite them.
              </p>
            ) : (
              <div className="mt-1.5 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleInvite(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      invitedIds.has(f.id)
                        ? 'bg-brand-600 text-white'
                        : 'border border-surface-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {invitedIds.has(f.id) ? '✓ ' : ''}
                    {f.displayName ?? f.username}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={submit} isLoading={submitting} className="w-full">
            {uploadPercent !== null ? `Uploading… ${uploadPercent}%` : 'Create room & notify friends'}
          </Button>
        </div>
      </div>
    </div>
  );
}
