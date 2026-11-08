// Developer-only observation. Never selects inputs or changes combat state.
export function drillContactGeometry(p,target){
 if(!target)return null;
 const fx=p.dx,fy=p.dy,length=Math.hypot(fx,fy)||1;
 const nx=fx/length,ny=fy/length;
 const dx=target.x-p.x,dy=target.y-p.y,distance=Math.hypot(dx,dy);
 const start=12,end=32+p.drillReach,radius=11+p.drillWidth*.53;
 const along=dx*nx+dy*ny,clipped=Math.max(start,Math.min(end,along));
 const capsuleDistance=Math.hypot(dx-nx*clipped,dy-ny*clipped);
 const targetRadius=target.r||0;
 return {distance,aimErrorDegrees:distance>0?Math.acos(Math.max(-1,Math.min(1,along/distance)))*180/Math.PI:0,
  withinRadialReach:distance<=end+radius+targetRadius,
  forwardCapsuleOverlap:capsuleDistance<=radius+targetRadius};
}
