declare module 'yt-search' {
  interface VideoSearchResult {
    type: string;
    videoId: string;
    url: string;
    title: string;
    description: string;
    image: string;
    thumbnail: string;
    seconds: number;
    timestamp: string;
    duration: {
      toString: () => string;
      seconds: number;
      timestamp: string;
    };
    views: number;
    author: {
      name: string;
      url: string;
    };
  }

  interface SearchResult {
    all: any[];
    videos: VideoSearchResult[];
    playlists: any[];
    channels: any[];
  }

  function search(query: string | { videoId?: string; query?: string }): Promise<any>;
  export default search;
}
