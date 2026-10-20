// Browser-test fixture only. Produces audio/video locally without accessing devices.
(() => {
 const create=(video,audio)=>{
  const tracks=[];
  if(video){
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
   const context=canvas.getContext('2d');let tick=0;
   setInterval(()=>{context.fillStyle='#1d5cf5';context.fillRect(0,0,640,360);context.fillStyle='white';context.font='32px sans-serif';context.fillText('Synthetic media '+tick++,35,130);},100);
   tracks.push(...canvas.captureStream(10).getVideoTracks());
  }
  if(audio){const context=new AudioContext(),oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();oscillator.frequency.value=440;oscillator.connect(destination);oscillator.start();context.resume();tracks.push(...destination.stream.getAudioTracks());}
  return new MediaStream(tracks);
 };
 navigator.mediaDevices.getUserMedia=async constraints=>create(!!constraints.video,!!constraints.audio);
 navigator.mediaDevices.getDisplayMedia=async()=>create(true,false);
})();
