export type AvatarPose = {
  x: number;
  y: number;
  character: 'kaguya' | 'internwitch';
  direction: 'up' | 'down' | 'left' | 'right';
  moving: boolean;
};
export type HallPeer = AvatarPose & { id: string; name: string };
export type HallWelcome = { id: string; name: string; peers: HallPeer[]; error?: string };
export type VoiceCredentials = { url: string; token: string; room: string; error?: string };
