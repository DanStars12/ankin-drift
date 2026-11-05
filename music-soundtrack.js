/* ANKIN DRIFT v13.33 — creator-supplied MP3 soundtrack.
 * A streaming, crossfading five-track player. Does not synthesize any old music.
 * Browser autoplay is unlocked only by the game's title-preview/start interaction.
 */
(function(root){
 'use strict';
 const TRACKS=Object.freeze({
  title: Object.freeze({title:'Neon Horizon',url:'./audio/neon-horizon.mp3'}),
  battle:Object.freeze({title:'16-Battle Beat',url:'./audio/16-battle-beat.mp3'}),
  trinity:Object.freeze({title:'TRINITY',url:'./audio/trinity.mp3'}),
  major:Object.freeze({title:'OVERDRIVE NEMESIS',url:'./audio/overdrive-nemesis.mp3'}),
  last:Object.freeze({title:'THE LAST HORIZON',url:'./audio/the-last-horizon.mp3'})
 });
 const FADE=1.05,STOP_FADE=.18,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const names=Object.freeze(Object.fromEntries(Object.entries(TRACKS).map(([id,track])=>[id,track.title])));
 function create(context,musicOutput,onTrackStart){
  const gate=context.createGain();gate.gain.value=0;gate.connect(musicOutput);
  let current=null,active=[],lastGateTarget=0,transitions=0,loops=0;
  let playbackStarts=0,lastError=null,pausedAt=null;
  function gainAt(track,now){
   const t=clamp((now-track.fadeAt)/Math.max(.001,track.fadeDuration),0,1);
   return track.fadeFrom+(track.fadeTo-track.fadeFrom)*t;
  }
  function fade(track,to,duration,now){
   const gain=track.gain.gain,from=gainAt(track,now);
   gain.cancelScheduledValues(now);
   gain.setValueAtTime(from,now);
   gain.linearRampToValueAtTime(to,now+duration);
   track.fadeFrom=from;track.fadeTo=to;track.fadeAt=now;track.fadeDuration=duration;
  }
  function tryPlay(track){
   if(track.playPending||track.started||track.element.error)return;
   track.playPending=true;
   try{
    const request=track.element.play();
    Promise.resolve(request).then(()=>{
     track.playPending=false;track.started=true;playbackStarts++;lastError=null;
     if(current===track&&typeof onTrackStart==='function'&&!track.announced){
      track.announced=true;onTrackStart({id:track.id,title:TRACKS[track.id].title,transitions});
     }
    }).catch(error=>{
     track.playPending=false;track.retryAt=context.currentTime+1.5;
     lastError=String(error?.message||error);
    });
   }catch(error){
    track.playPending=false;track.retryAt=context.currentTime+1.5;
    lastError=String(error?.message||error);
   }
  }
  function makeTrack(id,now){
   const element=new Audio(TRACKS[id].url);
   element.preload='auto';
   element.loop=true;
   const source=context.createMediaElementSource(element),gain=context.createGain();
   gain.gain.setValueAtTime(0,now);
   source.connect(gain);gain.connect(gate);
   const track={id,element,source,gain,fadeAt:now,fadeFrom:0,fadeTo:0,
    fadeDuration:1,retireAt:Infinity,playPending:false,started:false,
    announced:false,lastTime:0,retryAt:0};
   element.addEventListener('error',()=>{
    if(active.includes(track))lastError='BGMのファイルを読み込めません: '+TRACKS[id].url;
   });
   active.push(track);
   return track;
  }
  function retire(track,now,seconds=FADE){
   fade(track,0,seconds,now);
   track.retireAt=now+seconds+.05;
  }
  function dispose(track){
   track.element.pause();
   track.element.removeAttribute('src');
   try{track.element.load()}catch{}
   track.source.disconnect();track.gain.disconnect();
  }
  function switchTrack(id,now){
   for(const track of active)retire(track,now);
   const next=makeTrack(id,now);
   fade(next,1,FADE,now);
   current=next;transitions++;
   tryPlay(next);
  }
  function tick({scene='title',enabled=true,paused=false,duck=1}={}){
   const now=context.currentTime;
   const wanted=TRACKS[scene]?scene:'title';
   const target=enabled&&!paused?clamp(duck,0,1):0;
   if(target!==lastGateTarget){
    gate.gain.setTargetAtTime(target,now,.085);
    lastGateTarget=target;
   }
   if(!enabled&&current){
    for(const track of active)retire(track,now,STOP_FADE);
    current=null;
   }
   // No sound output continues silently after a crossfade or mute.
   active=active.filter(track=>{
    if(track.retireAt<=now){dispose(track);return false;}
    return true;
   });
   if(paused){
    if(pausedAt===null)pausedAt=now;
    if(now-pausedAt>.24)for(const track of active)track.element.pause();
    return;
   }
   pausedAt=null;
   if(!enabled)return;
   if(!current||current.id!==wanted)switchTrack(wanted,now);
   for(const track of active){
    if(track.element.paused&&!track.playPending&&now>=track.retryAt){
     track.started=false;tryPlay(track);
    }
    // HTMLAudioElement.loop restarts without firing "ended"; don't re-announce.
    if(track.element.currentTime+1<track.lastTime)loops++;
    track.lastTime=track.element.currentTime;
   }
  }
  function inspect(){
   return {track:current?.id||null,title:current?TRACKS[current.id].title:null,
    transitions,loops,scheduled:playbackStarts,activeTracks:active.length,
    contextState:context.state,error:lastError,
    src:current?.element.currentSrc||current?.element.src||null};
  }
  return Object.freeze({tick,inspect});
 }
 root.AnkinSoundtrack=Object.freeze({create,names,themeIds:Object.keys(TRACKS),tracks:TRACKS});
})(window);
