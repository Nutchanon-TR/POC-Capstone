export interface Point { x:number; y:number }
export interface Rect extends Point { width:number; height:number }
export interface Area extends Rect { id:string;kind:string;code:string }
export interface WorldData { width:number;height:number;tileWidth:number;columns:number;rows:number;floor:number[];tiles:{gid:number;image:string}[];sprites:(Rect&{id:number;name:string;gid:number;depth:number;interactable:boolean;kind:string;bounds:Rect})[];collisions:Rect[];areas:Area[];spawn:Point }
export interface Character { id:string;name:string;walk:string;idle:string|null }
export interface Peer extends Point { id:string;name:string;avatar:number;direction:number;moving:boolean;role:string;booth:string|null;dnd:boolean;hand:boolean;micOffer?:string|null;holdingMic?:boolean }
export interface DemoSession { id:string;key:string;name:string;role:string;ownedBooth:string|null;realtimeUrl:string }
export interface AppBridge {
 state:{route:string;avatar:number;name:string;paused:boolean;project:number;zoom:number;role:string;mic:boolean;cam:boolean;pendingWarp?:number};
 chars:Character[];toast:(message:string)=>void;
}
declare global {
 interface Window {
  Connecta:AppBridge;
  ConnectaHall?:{warp:(index:number)=>void;zoom:(value:number)=>void;position:()=>Point;snapshot:()=>unknown;destroy:()=>void;emote:(text:string)=>void;say:(text:string,id?:string)=>void};
  ConnectaMedia?:{session:DemoSession|null;peers:Map<string,Peer>;connect:()=>Promise<void>;disconnect:()=>Promise<void>;mic:()=>Promise<void>;camera:()=>Promise<void>;screen:()=>Promise<void>;action:(name:string,data?:Record<string,unknown>)=>Promise<unknown>;send:(type:string,data:unknown)=>void;status:()=>unknown};
 }
}
