export {};

declare global {
  interface Window {
    YT?: {
      Player: new (...args: any[]) => YT.Player;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        CUED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }

  namespace YT {
    interface Player {
      loadVideoById: (videoId: string) => void;
      cueVideoById?: (videoId: string) => void;
      loadPlaylist: (options: { listType: "playlist"; list: string }) => void;
      playVideo: () => void;
      pauseVideo: () => void;
      nextVideo: () => void;
      previousVideo: () => void;
      getCurrentTime: () => number;
      getDuration: () => number;
      getVideoData: () => { title?: string; video_id?: string };
      getVideoUrl?: () => string;
      getPlaylist: () => string[];
      getPlaylistIndex: () => number;
      setVolume: (volume: number) => void;
      isMuted: () => boolean;
      mute: () => void;
      unMute: () => void;
    }
  }
}
