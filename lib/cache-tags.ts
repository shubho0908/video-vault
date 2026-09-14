export const ownerEntriesTag = (ownerId: string) =>
  `journal:${ownerId}:entries`;
export const ownerPlaylistsTag = (ownerId: string) =>
  `journal:${ownerId}:playlists`;
export const entryTag = (ownerId: string, entryId: string) =>
  `journal:${ownerId}:entry:${entryId}`;
export const playlistTag = (ownerId: string, playlistId: string) =>
  `journal:${ownerId}:playlist:${playlistId}`;
