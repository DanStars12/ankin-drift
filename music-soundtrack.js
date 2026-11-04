/* ANKIN DRIFT: original, asset-free 16-bit-style compositions.
 * Each theme is an eight-bar piece with its own melody, harmony and drum groove.
 * Web Audio unlock is owned by the game: this module NEVER starts automatically. */
(function(root){
 'use strict';
 const NAMES=Object.freeze({
  title:'STARBOUND SIGNAL',
  battle:'NEON DRIFT',
  boss:'THE END PROTOCOL'
 });
 const REST=-1;
 // Original melody lines: sparse [sixteenth position, MIDI note, length in steps].
 const THEMES={
  title:{
   bpm:94,lead:'triangle',bass:[40,36,43,38,40,36,43,38],
   chords:[[0,3,7],[0,4,7],[0,4,7],[0,3,7],[0,3,7],[0,4,7],[0,4,7],[0,3,7]],
   arp:[0,2,1,2,0,1,2,1],
   melody:[
    [[0,76,3],[4,79,2],[7,83,3],[11,81,2],[14,79,2]],
    [[0,76,4],[6,74,2],[9,76,2],[12,79,4]],
    [[0,79,3],[4,83,3],[8,86,2],[11,83,2],[14,81,2]],
    [[0,79,4],[6,76,3],[10,74,3],[14,76,2]],
    [[0,76,3],[4,79,2],[7,83,3],[11,88,2],[14,86,2]],
    [[0,83,3],[4,81,2],[7,79,3],[11,76,2],[14,74,2]],
    [[0,79,3],[4,83,2],[7,86,3],[10,88,2],[13,86,3]],
    [[0,83,4],[5,81,2],[8,79,3],[12,76,4]]
   ]
  },
  battle:{
   bpm:148,lead:'square',bass:[38,34,41,36,38,34,41,36],
   chords:[[0,3,7],[0,4,7],[0,4,7],[0,4,7],[0,3,7],[0,4,7],[0,4,7],[0,4,7]],
   arp:[0,1,2,1,0,2,1,2],
   melody:[
    [[0,74,2],[2,77,2],[4,81,3],[8,84,2],[10,81,2],[12,77,2],[14,74,2]],
    [[0,77,2],[2,81,2],[4,86,2],[7,84,2],[9,81,2],[12,79,2],[14,77,2]],
    [[0,77,2],[2,81,2],[4,84,2],[6,88,2],[8,86,2],[11,84,2],[14,81,2]],
    [[0,79,3],[3,76,2],[5,79,2],[8,84,3],[12,81,2],[14,79,2]],
    [[0,86,2],[2,84,2],[4,81,2],[6,77,2],[8,81,2],[10,84,2],[12,86,4]],
    [[0,89,2],[2,86,2],[4,84,2],[7,81,2],[9,77,2],[12,81,2],[14,84,2]],
    [[0,88,2],[2,84,2],[4,81,2],[6,84,2],[8,88,2],[10,91,2],[12,88,4]],
    [[0,86,2],[2,84,2],[4,81,2],[6,79,2],[8,77,2],[10,76,2],[12,74,4]]
   ]
  },
  boss:{
   bpm:174,lead:'sawtooth',bass:[42,38,45,40,42,38,45,40],
   chords:[[0,3,6],[0,3,7],[0,3,6],[0,4,7],[0,3,6],[0,3,7],[0,3,6],[0,4,7]],
   arp:[0,2,1,2,0,2,1,2],
   melody:[
    [[0,78,2],[2,79,2],[4,84,2],[6,87,2],[8,90,2],[10,87,2],[12,84,2],[14,79,2]],
    [[0,82,2],[2,85,2],[4,89,2],[6,85,2],[8,82,2],[10,80,2],[12,77,2],[14,82,2]],
    [[0,81,2],[2,84,2],[4,87,2],[6,93,2],[8,90,2],[10,87,2],[12,84,2],[14,81,2]],
    [[0,83,2],[2,80,2],[4,76,2],[6,80,2],[8,83,2],[10,88,2],[12,92,4]],
    [[0,90,2],[2,87,2],[4,84,2],[6,81,2],[8,87,2],[10,90,2],[12,93,4]],
    [[0,89,2],[2,85,2],[4,82,2],[6,77,2],[8,82,2],[10,85,2],[12,89,4]],
    [[0,93,2],[2,90,2],[4,87,2],[6,84,2],[8,90,2],[10,93,2],[12,96,4]],
    [[0,92,2],[2,88,2],[4,83,2],[6,80,2],[8,83,2],[10,80,2],[12,78,4]]
   ]
  }
 };
 function midiFrequency(n){return 440*Math.pow(2,(n-69)/12)}
 function create(context,musicOutput,onTrackStart){
  const gate=context.createGain();gate.gain.value=0;gate.connect(musicOutput);
  let noiseBuffer=null,tracks=[],current=null,transitions=0,loops=0,scheduled=0;
  function note(midi,t,duration,wave,volume,bus,bend=0){
   if(midi===REST||midi==null||duration<=0)return;
   const osc=context.createOscillator(),env=context.createGain(),freq=midiFrequency(midi);
   const end=t+Math.max(.055,duration);
   osc.type=wave;osc.frequency.setValueAtTime(freq,t);
   if(bend)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*Math.pow(2,bend/12)),end);
   env.gain.setValueAtTime(.0001,t);
   env.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.008);
   env.gain.exponentialRampToValueAtTime(.0001,end);
   osc.connect(env);env.connect(bus);osc.start(t);osc.stop(end+.012);
   osc.onended=()=>{osc.disconnect();env.disconnect()};
   scheduled++;
  }
  function noise(t,duration,volume,bus,highpass){
   if(!noiseBuffer){
    const size=Math.round(context.sampleRate*.20);
    noiseBuffer=context.createBuffer(1,size,context.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    // Stable offline-compatible pseudo-random noise; never uses game Math.random.
    let seed=0x12345678;
    for(let i=0;i<size;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=(seed/2147483648)*.50;}
   }
   const src=context.createBufferSource(),filter=context.createBiquadFilter(),amp=context.createGain();
   src.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=highpass;
   amp.gain.setValueAtTime(Math.max(.0001,volume),t);
   amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
   src.connect(filter);filter.connect(amp);amp.connect(bus);
   src.start(t);src.stop(t+duration+.002);
   src.onended=()=>{src.disconnect();filter.disconnect();amp.disconnect()};
  }
  function soundStep(v,t){
   const theme=THEMES[v.id],step=v.step%128,bar=Math.floor(step/16),unit=step%16,beat=60/theme.bpm/4;
   const root=theme.bass[bar],notes=theme.chords[bar],melody=theme.melody[bar];
   for(const [position,midi,length] of melody){
    if(position===unit)note(midi,t,beat*length*.86,theme.lead,
     v.id==='boss'?.035:v.id==='battle'?.028:.052,v.gain);
   }
   // Counterpoint arpeggio changes with every chord; different octaves per track.
   if(v.id==='title'?unit%2===0:unit%2===0){
    const chordIndex=theme.arp[Math.floor(unit/2)],chordNote=root+notes[chordIndex]+24;
    note(chordNote,t,beat*(v.id==='title'?1.72:1.23),
     'triangle',v.id==='title'?.028:.022,v.gain);
   }
   if(unit%4===0){
    const bassNote=root+(unit===12?7:0);
    note(bassNote,t,beat*(v.id==='title'?4.8:3.25),'triangle',
     v.id==='boss'?.108:.098,v.gain);
    if(v.id==='title'&&unit%8===0){
     for(const interval of notes)note(root+interval+36,t,beat*7.4,'sine',.010,v.gain);
    }
    if(v.id!=='title')note(35,t,beat*1.2,'sine',.095,v.gain,-14);
   }
   if(v.id==='title'){
    if(unit===8)note(43,t,beat*2.6,'sine',.052,v.gain,-8);
    if(unit===4||unit===12)noise(t,.06,.012,v.gain,4600);
   }else{
    if(unit===4||unit===12){
     noise(t,.125,v.id==='boss'?.043:.035,v.gain,1250);
     note(54,t,beat*.75,'triangle',.014,v.gain,-5);
    }
    if(unit%2===0||v.id==='boss'){
     noise(t,.042,v.id==='boss'?.016:.009,v.gain,4900);
    }
    if(v.id==='boss'&&unit===14)note(root+36,t,beat*2,'square',.013,v.gain);
   }
   v.step++;
   if(v.step===128){v.step=0;loops++} // silent seamless loop, no track-start callback
   v.next=t+beat;
  }
  function transition(id,now){
   const fade=1.05;
   for(const v of tracks){
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value,now);
    v.gain.gain.linearRampToValueAtTime(0,now+fade);
    v.expire=now+fade+.08;
   }
   const gain=context.createGain();gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(1,now+fade);
   gain.connect(gate);
   const v={id,gain,step:0,next:now+.045,expire:Infinity};
   tracks.push(v);current=id;transitions++;
   if(typeof onTrackStart==='function')onTrackStart({id,title:NAMES[id],transitions});
  }
  function tick({scene,enabled=true,paused=false,duck=1}={}){
   const now=context.currentTime;
   const target=enabled&&!paused?Math.max(0,Math.min(1,duck)):0;
   gate.gain.setTargetAtTime(target,now,.09);
   if(!enabled){
    for(const v of tracks)v.gain.disconnect();
    tracks=[];current=null;
    return;
   }
   if(paused||context.state!=='running')return;
   if(!THEMES[scene])scene='title';
   if(current!==scene)transition(scene,now);
   tracks=tracks.filter(v=>{
    if(v.expire<=now){v.gain.disconnect();return false}
    return true;
   });
   for(const v of tracks){
    if(v.next<now-.25)v.next=now+.025; // background/CPU stalls never queue an audio backlog
    let limit=0;
    while(v.next<now+.14&&limit++<5)soundStep(v,v.next);
   }
  }
  function inspect(){
   return {track:current,title:current?NAMES[current]:null,transitions,loops,scheduled,
    activeTracks:tracks.length,contextState:context.state};
  }
  return {tick,inspect};
 }
 root.AnkinSoundtrack=Object.freeze({create,names:NAMES,themeIds:Object.keys(THEMES)});
})(window);
