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
  let noiseBuffer=null,tracks=[],current=null,transitions=0,loops=0,scheduled=0,lateStepsSkipped=0,lastGateTarget=null;
  function note(midi,t,duration,wave,volume,bus,bend=0){
   if(midi===REST||midi==null||duration<=0)return;
   const osc=context.createOscillator(),env=context.createGain(),freq=midiFrequency(midi);
   const end=t+Math.max(.070,duration);
   const attack=wave==='square'||wave==='sawtooth'?.014:.009,release=.016;
   osc.type=wave;osc.frequency.setValueAtTime(freq,t);
   if(bend)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*Math.pow(2,bend/12)),end);
   // Start and finish at EXACT silence. A non-zero final sample makes audible clicks
   // at rapid sixteenth-note attacks (most obvious with the battle square lead).
   env.gain.setValueAtTime(0,t);
   env.gain.linearRampToValueAtTime(Math.max(.0002,volume),t+attack);
   env.gain.exponentialRampToValueAtTime(.0002,end-release);
   env.gain.linearRampToValueAtTime(0,end);
   // Keep the chiptune timbre while removing the harsh ultrasonic edge.
   const filter=(wave==='square'||wave==='sawtooth')?context.createBiquadFilter():null;
   if(filter){
    filter.type='lowpass';filter.frequency.value=wave==='square'?5400:4700;
    filter.Q.value=.35;osc.connect(filter);filter.connect(env);
   }else osc.connect(env);
   env.connect(bus);osc.start(t);osc.stop(end+.003);
   osc.onended=()=>{osc.disconnect();filter?.disconnect();env.disconnect()};
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
   const src=context.createBufferSource(),filter=context.createBiquadFilter(),
    softener=context.createBiquadFilter(),amp=context.createGain();
   src.buffer=noiseBuffer;
   // Narrow the metallic hiss but retain a recognisable snare/hi-hat texture.
   filter.type='highpass';filter.frequency.value=highpass>4000?2800:highpass;
   softener.type='lowpass';softener.frequency.value=highpass>4000?6800:6200;
   softener.Q.value=.4;
   const length=Math.max(.035,duration),attack=Math.min(.008,length*.20),release=Math.min(.018,length*.28);
   // White-noise buffers begin at a random non-zero sample: fading IN is essential.
   amp.gain.setValueAtTime(0,t);
   amp.gain.linearRampToValueAtTime(Math.max(.0002,volume),t+attack);
   amp.gain.exponentialRampToValueAtTime(.0002,t+length-release);
   amp.gain.linearRampToValueAtTime(0,t+length);
   src.connect(filter);filter.connect(softener);softener.connect(amp);amp.connect(bus);
   src.start(t);src.stop(t+length+.003);
   src.onended=()=>{src.disconnect();filter.disconnect();softener.disconnect();amp.disconnect()};
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
     noise(t,.049,v.id==='boss'?.011:.006,v.gain,4900);
    }
    if(v.id==='boss'&&unit===14)note(root+36,t,beat*2,'square',.013,v.gain);
   }
   v.step++;
   if(v.step===128){v.step=0;loops++} // silent seamless loop, no track-start callback
   v.next=t+beat;
  }
  function trackGainAt(v,now){
   if(v.fadeOutAt!==null){
    return Math.max(0,v.fadeOutGain*(1-(now-v.fadeOutAt)/v.fadeOutDuration));
   }
   return Math.min(1,Math.max(0,(now-v.fadeInAt)/v.fadeInDuration));
  }
  function fadeOutTrack(v,now,duration){
   const currentGain=trackGainAt(v,now);
   v.gain.gain.cancelScheduledValues(now);
   v.gain.gain.setValueAtTime(currentGain,now);
   v.gain.gain.linearRampToValueAtTime(0,now+duration);
   v.fadeOutAt=now;v.fadeOutGain=currentGain;v.fadeOutDuration=duration;
   v.expire=now+duration+.08;
  }
  function transition(id,now){
   const fade=1.05;
   for(const v of tracks)fadeOutTrack(v,now,fade);
   const gain=context.createGain();gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(1,now+fade);
   gain.connect(gate);
   const v={id,gain,step:0,next:now+.045,expire:Infinity,
    fadeInAt:now,fadeInDuration:fade,fadeOutAt:null,fadeOutGain:0,fadeOutDuration:0};
   tracks.push(v);current=id;transitions++;
   if(typeof onTrackStart==='function')onTrackStart({id,title:NAMES[id],transitions});
  }
  function tick({scene,enabled=true,paused=false,duck=1}={}){
   const now=context.currentTime;
   const target=enabled&&!paused?Math.max(0,Math.min(1,duck)):0;
   if(target!==lastGateTarget){
    gate.gain.setTargetAtTime(target,now,.085);
    lastGateTarget=target;
   }
   if(!enabled){
    // Do not disconnect a sounding oscillator abruptly when music is muted.
    if(current!==null){
     for(const v of tracks)fadeOutTrack(v,now,.16);
     current=null;
    }
    tracks=tracks.filter(v=>{
     if(v.expire<=now){v.gain.disconnect();return false}
     return true;
    });
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
    const beat=60/THEMES[v.id].bpm/4,earliest=now+.018;
    // Never start a sound in the past. If a busy frame misses a beat, skip
    // those steps rather than making the browser start mid-envelope with a pop.
    if(v.next<earliest){
     const skipped=Math.ceil((earliest-v.next)/beat);
     const advanced=v.step+skipped;
     loops+=Math.floor(advanced/128);v.step=advanced%128;
     v.next+=skipped*beat;lateStepsSkipped+=skipped;
    }
    let limit=0;
    while(v.next<now+.17&&limit++<6)soundStep(v,v.next);
   }
  }
  function inspect(){
   return {track:current,title:current?NAMES[current]:null,transitions,loops,scheduled,lateStepsSkipped,
    activeTracks:tracks.length,contextState:context.state};
  }
  return {tick,inspect};
 }
 root.AnkinSoundtrack=Object.freeze({create,names:NAMES,themeIds:Object.keys(THEMES)});
})(window);
