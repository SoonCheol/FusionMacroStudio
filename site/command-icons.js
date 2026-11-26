// Original CAD-style vector artwork for Fusion Macro Studio.
// No Autodesk image assets are included. Local original PNGs override these.
const ink='#26465c', blue='#277fae', pale='#b6e1ef', amber='#e9a23d', red='#d85a50', green='#45956f', violet='#8066bd';
const path=(d,s=ink,w=1.7,f='none',extra='')=>'<path d="'+d+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
const line=(x,y,X,Y,c=ink,w=1.7)=>path('M'+x+' '+y+' L'+X+' '+Y,c,w);
const circle=(x,y,r,f='none',s=ink,w=1.5)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'"/>';
const rect=(x,y,w,h,f='none',s=ink,r=1)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.5"/>';
const dots=(...pts)=>pts.map(([x,y])=>circle(x,y,1.85,amber,'#fff',.65)).join('');
// Sketch references: grey geometry and blue square sketch handles.
const sketchInk='#555e65', sketchBlue='#149bd2';
const nodes=(...pts)=>pts.map(([x,y])=>rect(x-1.35,y-1.35,2.7,2.7,sketchBlue,'#edf8ff',.15)).join('');
const sketchLine=(d,w=1.45)=>path(d,sketchInk,w);
const sketchDash=(d)=>path(d,sketchBlue,1.35,'none','stroke-dasharray="2.5 2"');
const dash=(d,c=blue)=>path(d,c,1.3,'none','stroke-dasharray="2.5 2.1"');
const arrow=(x,y,X,Y,c=blue)=>{const a=Math.atan2(Y-y,X-x),r=4;return line(x,y,X,Y,c,2)+path('M'+(X-r*Math.cos(a-.6))+' '+(Y-r*Math.sin(a-.6))+' L'+X+' '+Y+' L'+(X-r*Math.cos(a+.6))+' '+(Y-r*Math.sin(a+.6)),c,1.8)};
const plane=(x=4,y=14)=>path('M'+x+' '+y+' l13 -7 12 7 -13 7Z',blue,1.35,'#c1e5ee');
const cube=(x=5,y=5,h=14,accent=false)=>path('M'+x+' '+(y+5)+' l11 -5 11 5 -11 6Z',ink,1.15,accent?'#f8d28e':'#c1e5ef')+path('M'+x+' '+(y+5)+' l11 6 v'+h+' l-11 -6Z',ink,1.15,'url(#side)')+path('M'+(x+11)+' '+(y+11)+' l11 -6 v'+h+' l-11 6Z',ink,1.15,'#5e9db8');
const cyl=(x=16,y=7,r=9,h=14)=>path('M'+(x-r)+' '+y+' v'+h+' a'+r+' 4 0 0 0 '+(r*2)+' 0 v-'+h,ink,1.2,'url(#side)')+'<ellipse cx="'+x+'" cy="'+y+'" rx="'+r+'" ry="4.5" fill="url(#top)" stroke="'+ink+'" stroke-width="1.3"/>';
const sphere=()=>circle(16,16,11,'url(#ball)',ink,1.25)+path('M6 17 Q16 23 26 17',blue,1.1)+path('M16 5 Q26 16 16 27',blue,1.1);
const check=()=>path('M7 16 l6 6 12 -14',green,3);
const cross=(x=16,y=16,c=red)=>path('M'+(x-4)+' '+(y-4)+' l8 8 M'+(x+4)+' '+(y-4)+' l-8 8',c,2.4);
const letters=(s,x=16,y=20,size=12,c=ink)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="700" font-size="'+size+'" fill="'+c+'">'+s+'</text>';
const poly=(pts)=>path('M'+pts.map(p=>p.join(' ')).join(' L')+' Z',blue,1.8,'#d9edf4');
const curves=()=>path('M3 24 C8 3 17 29 29 7',blue,2);
const grid=(c=blue)=>[8,16,24].map(x=>line(x,4,x,28,c,1)).join('')+[8,16,24].map(y=>line(4,y,28,y,c,1)).join('');
const gear=()=>{let pts=[];for(let i=0;i<32;i++){let a=i*Math.PI/16,r=i%4===0||i%4===3?9:12;pts.push([16+r*Math.cos(a),16+r*Math.sin(a)])}return poly(pts)+circle(16,16,4,'#fff',ink,1.5)};
const paper=()=>path('M7 3 H20 L26 9 V29 H7Z',ink,1.4,'#f1f6f8')+path('M20 3 V9 H26',ink,1.2)+line(11,15,22,15,blue)+line(11,20,22,20,blue)+line(11,25,18,25,blue);
const mesh=()=>poly([[3,24],[7,8],[19,3],[29,11],[26,26],[15,29]])+path('M3 24 L19 3 L26 26 L7 8 L29 11 L15 29 L3 24 M7 8 L15 29 M19 3 L29 11',blue,1.1);
const joint=()=>circle(9,17,5,'url(#top)')+circle(23,17,5,'url(#top)')+line(9,17,23,17,blue,3)+circle(16,17,3,amber,ink);
const bodies={
 line:()=>sketchLine('M3.5 24 H20.5 C27 24 30 20 29 14 C28 8 24 6 19 6')+nodes([3.5,24],[20.5,24],[19,6]),
 midpoint:()=>sketchLine('M4 28 L28 4')+nodes([4,28],[16,16],[28,4]),
 rect2:()=>rect(4,7,24,18,'none',sketchInk,.15)+nodes([4,7],[28,25]),
 rect3:()=>sketchLine('M4 15 L21 5 L28 18 L11 28 Z')+nodes([4,15],[21,5],[28,18]),
 rectcenter:()=>rect(4,6,24,20,'none',sketchInk,.15)+sketchDash('M4 6 L28 26 M28 6 L4 26')+nodes([16,16],[28,26]),
 circlecenter:()=>circle(16,16,12,'none',sketchInk,1.4)+arrow(16,16,24,8,sketchBlue)+arrow(16,16,8,24,sketchBlue)+nodes([16,16]),
 circle2:()=>circle(16,16,12,'none',sketchInk,1.4)+sketchDash('M5 16 H27')+nodes([4,16],[28,16]),
 circle3:()=>circle(16,16,12,'none',sketchInk,1.4)+nodes([16,4],[4,16],[25,24]),
 circletan2:()=>line(3,6,28,6)+line(6,6,6,29)+circle(16,16,10,'#d7ecf4',blue)+dots([16,6],[6,16]),
 circletan3:()=>path('M3 5 H29 L16 30Z',ink,1.4)+circle(16,13,8,'#d7ecf4',blue)+dots([16,5],[9,17],[23,17]),
 arc3:()=>sketchLine('M4 24 Q8 -2 28 12')+nodes([4,24],[12,10],[28,12]),
 arccenter:()=>sketchLine('M5 23 A17 17 0 0 1 25 5')+sketchDash('M24 24 L5 23 M24 24 L25 5')+nodes([5,23],[24,24],[25,5]),
 arctan:()=>sketchLine('M3 25 H12 A14 14 0 0 0 26 8')+nodes([12,25],[26,8]),
 polygon:()=>poly([[16,4],[27,11],[27,23],[16,29],[5,23],[5,11]])+dots([16,4],[27,11]),
 polygonin:()=>circle(16,16,13,'none',blue,1)+poly([[16,4],[27,11],[27,23],[16,28],[5,23],[5,11]])+dots([16,16]),
 polygonout:()=>poly([[16,3],[28,9],[28,23],[16,29],[4,23],[4,9]])+circle(16,16,10,'none',blue,1)+dots([16,16]),
 ellipse:()=>'<ellipse cx="16" cy="17" rx="12" ry="8" fill="none" stroke="'+sketchInk+'" stroke-width="1.45"/>'+sketchLine('M13 17 H19 M16 14 V20',1)+nodes([16,9],[28,17]),
 slot:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dash('M9 16 H23')+dots([9,16],[23,16]),
 slotend:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dots([3,16],[29,16]),
 slotcenter:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dash('M9 16 H23')+dots([16,16],[23,16]),
 arcslot:()=>path('M5 25 A20 20 0 0 1 25 5 A4 4 0 0 1 25 13 A12 12 0 0 0 13 25 A4 4 0 0 1 5 25Z',blue,1.7,'#d7ecf4')+dots([9,25],[25,9]),
 spline:()=>sketchLine('M3 27 C4 7 8 6 12 9 C20 15 24 30 28 3',1.55)+nodes([3,27],[8,8],[23,19],[28,3]),
 controlspline:()=>sketchLine('M3 24 C8 3 17 29 29 7')+sketchDash('M3 24 L8 3 L17 29 L29 7')+nodes([3,24],[8,3],[17,29],[29,7]),
 conic:()=>path('M4 26 Q4 5 28 5',blue,2)+dash('M4 26 L4 5 L28 5')+dots([4,26],[4,5],[28,5]),
 point:()=>sketchLine('M4 16 H28 M16 4 V28',1.1)+nodes([16,16]),
 text:()=>letters('A',16,26,26,sketchInk),
 mirror:()=>sketchLine('M4 28 L14 4 V28 Z M18 4 V28 H28 Z')+line(16,3,16,29,sketchBlue,1.6)+line(18,4,28,28,sketchBlue,1.4),
 circular:()=>[0,1,2,3,4,5].map(i=>circle(16+10*Math.cos(i*Math.PI/3),16+10*Math.sin(i*Math.PI/3),2.8,'none',i%2?sketchBlue:sketchInk,1.3)).join('')+nodes([16,16]),
 pattern:()=>[0,1].flatMap(y=>[0,1,2].map(x=>rect(4+x*9,8+y*12,5,5,'none',(x+y)%2?sketchBlue:sketchInk,.2))).join('')+sketchDash('M7 14 V20 M12 10 H16'),
 pathpattern:()=>curves()+dots([4,23],[12,14],[21,16],[29,7]),
 project:()=>plane(3,23)+path('M5 7 L18 2 27 7 14 12Z',ink,1.4,'#c9b9ed')+arrow(15,11,15,23,violet),
 intersect:()=>plane(2,18)+path('M13 3 L26 10 V27 L13 20Z',blue,1.4,'#b0deea')+line(13,13,25,20,violet,2.4),
 dimension:()=>line(6,6,6,27)+line(26,6,26,27)+line(6,23,26,23,blue)+arrow(16,11,6,11,blue)+arrow(16,11,26,11,blue)+letters('25',16,8,8,ink),
 fillet2:()=>sketchLine('M5 29 V17 M17 5 H29')+path('M5 17 Q5 5 17 5',sketchBlue,1.7)+nodes([5,17],[17,5]),
 chamfer2:()=>sketchLine('M5 29 V16 M16 5 H29')+path('M5 16 L16 5',sketchBlue,1.8)+nodes([5,16],[16,5]),
 offset:()=>sketchLine('M28 8 H15 C-1 8 -1 24 15 24 H28')+path('M28 4 H15 C-7 4 -7 28 15 28 H28',sketchBlue,1.5),
 trim:()=>sketchDash('M3 7 H28')+sketchLine('M16 7 L22 18 L10 28 M16 7 L10 18 L22 28',2)+circle(10,25,4,'none',sketchInk,1.7)+circle(22,25,4,'none',sketchInk,1.7),
 extend:()=>line(3,25,15,14,blue,2)+dash('M15 14 L26 4')+arrow(15,14,26,4,blue)+line(21,2,30,12),
 break:()=>line(3,16,12,16,blue,2)+line(20,16,29,16,blue,2)+path('M11 22 l3 -12 M18 22 l3 -12',red,1.8),
 scale:()=>rect(4,15,12,12,'#d7ecf4',blue)+dash('M4 4 H28 V28 H4Z')+arrow(16,16,28,4,blue),
 move:()=>arrow(16,16,16,3)+arrow(16,16,29,16)+arrow(16,16,16,29)+arrow(16,16,3,16)+circle(16,16,2.4,amber,ink),
 hv:()=>path('M5 26 H26 V5',blue,2)+dots([5,26],[26,26],[26,5]),
 coincident:()=>line(4,27,16,16,blue,2)+line(16,16,28,5,blue,2)+circle(16,16,3,amber,ink),
 tangent:()=>circle(13,14,9,'#d7ecf4',blue)+line(4,27,29,20)+dots([15,23]),
 equal:()=>path('M6 12 H26 M6 20 H26',blue,2.5)+dots([6,12],[26,20]),
 parallel:()=>path('M5 25 L22 5 M12 29 L29 9',blue,2.2),
 perpendicular:()=>path('M5 25 H26 M16 25 V5 M16 20 H21 V25',blue,2),
 fix:()=>rect(8,14,16,13,'#d8e9ef',ink,2)+path('M11 14 V9 A5 5 0 0 1 21 9 V14',blue,2)+circle(16,20,2,amber,ink),
 concentric:()=>circle(16,16,12,'none',blue,1.8)+circle(16,16,7,'none',blue,1.8)+dots([16,16]),
 symmetry:()=>dash('M16 3 V29')+line(4,23,12,9,blue,2)+line(28,23,20,9,blue,2)+dots([12,9],[20,9]),
 sketch:()=>plane(3,17)+path('M9 12 l8 -5 7 4 -8 5Z',blue,1.3,'none')+arrow(24,13,29,6,green),
 finish:()=>plane(3,15)+check(),
 extrude:()=>cube(4,12,8,true)+arrow(16,15,16,2,blue),
 revolve:()=>cyl(17,9,7,13)+dash('M16 2 V30')+path('M5 13 A12 6 0 0 1 27 14',blue,1.9)+arrow(25,11,28,15,blue),
 sweep:()=>path('M4 25 C11 25 11 8 25 8 L25 15 C15 15 17 29 4 29Z',ink,1.35,'url(#side)')+circle(25,11.5,4,'url(#top)',ink)+dash('M4 26 C12 26 12 11 25 11'),
 loft:()=>path('M5 8 Q16 0 27 8 L23 25 Q16 30 9 25Z',ink,1.3,'url(#side)')+'<ellipse cx="16" cy="8" rx="11" ry="4" fill="url(#top)" stroke="'+ink+'" stroke-width="1.2"/>'+path('M9 25 Q16 21 23 25',blue,1.2),
 rib:()=>plane(3,22)+path('M8 21 L20 6 V15 L8 26Z',ink,1.3,'url(#side)')+path('M20 6 L25 9 V18 L20 15Z',ink,1.2,'#75aec8'),
 hole:()=>cube(4,6,12)+ '<ellipse cx="15" cy="12" rx="4.3" ry="2.4" fill="#28495e" stroke="'+ink+'" stroke-width="1.1"/>'+arrow(15,2,15,9,blue),
 thread:()=>cyl(16,6,8,19)+[9,13,17,21].map(y=>path('M8 '+y+' Q16 '+(y+7)+' 24 '+(y+1),ink,1.4)).join(''),
 box:()=>cube(5,3,16),
 cylinder:()=>cyl(),
 sphere,
 torus:()=>'<ellipse cx="16" cy="16" rx="13" ry="10" fill="url(#side)" stroke="'+ink+'" stroke-width="1.3"/><ellipse cx="16" cy="15" rx="6" ry="4" fill="#f4f7f9" stroke="'+ink+'" stroke-width="1.2"/>'+path('M4 16 Q16 29 28 16',blue,1.2),
 coil:()=>[0,1,2,3].map(i=>path('M7 '+(6+i*5)+' C29 '+(1+i*5)+' 29 '+(14+i*5)+' 7 '+(12+i*5),blue,2.2)).join(''),
 pipe:()=>path('M4 24 V15 Q4 6 13 6 H27 V14 H15 Q12 14 12 17 V24Z',ink,1.3,'url(#side)')+'<ellipse cx="8" cy="24" rx="4" ry="2.5" fill="#28495e" stroke="'+ink+'"/><ellipse cx="27" cy="10" rx="2.5" ry="4" fill="#28495e" stroke="'+ink+'"/>',
 fillet:()=>path('M4 13 L15 7 28 13 17 20 4 13Z',ink,1.3,'url(#top)')+path('M4 13 V24 Q4 29 10 29 L17 25 V20Z',ink,1.3,'url(#side)')+path('M17 20 L28 13 V21 Q28 24 24 27 L17 29Z',ink,1.3,'#74b0c9')+path('M4 24 Q4 29 10 29 L17 25',amber,2.3),
 chamfer:()=>path('M4 12 L15 6 28 12 17 19Z',ink,1.3,'url(#top)')+path('M4 12 V23 L10 28 17 24 V19Z',ink,1.3,'url(#side)')+path('M17 19 L28 12 V22 L17 28Z',ink,1.3,'#74b0c9')+path('M4 23 L10 28 17 24',amber,2.2),
 shell:()=>path('M4 10 L16 3 28 10 V25 L16 31 4 25Z',ink,1.3,'url(#side)')+path('M4 10 L16 3 28 10 16 17Z',ink,1.3,'#c7e6ef')+path('M9 10 L16 6 23 10 16 14Z',ink,1.2,'#315a70')+path('M9 10 V17 L16 21 23 17 V10 L16 14Z',ink,1.1,'#76abc0'),
 draft:()=>path('M4 25 L8 9 18 3 27 10 28 25 16 30Z',ink,1.3,'url(#side)')+path('M8 9 L18 3 27 10 16 16Z',ink,1.3,'url(#top)')+line(16,16,16,30)+dash('M4 6 V25')+path('M4 13 Q7 16 8 18',amber,2),
 combine:()=>cube(2,5,11)+cube(11,11,11,true)+path('M8 21 L19 14',green,2.5),
 split:()=>cube(4,5,14)+path('M2 16 L18 5 30 11 14 23Z',blue,1.3,'#9bd5e6','fill-opacity=".65"')+dash('M2 16 L14 23 30 11',red),
 face:()=>cube(4,5,13,true)+arrow(15,12,24,3,blue),
 delete:()=>cube(4,5,12)+cross(23,23),
 align:()=>rect(4,7,9,11,'#c9e5ef',blue)+rect(19,16,9,11,'#c9e5ef',blue)+dash('M3 24 H29')+arrow(9,11,9,23)+arrow(23,13,23,23),
 material:()=>sphere()+circle(24,23,5,amber,ink),
 plane:()=>plane(3,16)+dash('M16 5 V27')+dots([16,12]),
 axis:()=>plane(3,21)+dash('M16 3 V29')+arrow(16,23,16,3,blue),
 constructpoint:()=>plane(3,20)+dash('M16 3 V28')+dots([16,13]),
 surface:()=>path('M3 21 Q8 3 16 12 T29 8 L29 21 Q22 29 16 22 T3 30Z',blue,1.4,'url(#top)')+path('M3 21 Q8 3 16 12 T29 8 M9 17 L9 26 M16 12 V22 M23 13 V25',blue,1.1),
 stitch:()=>path('M3 8 L14 4 V26 L3 30Z',blue,1.3,'#b6e1ef')+path('M18 4 L29 8 V30 L18 26Z',blue,1.3,'#b6e1ef')+[8,13,18,23].map(y=>line(12,y,20,y,amber,1.8)).join(''),
 normal:()=>plane(3,20)+arrow(16,19,16,3,blue),
 mesh,
 cutmesh:()=>mesh()+path('M3 17 L21 5 29 12 11 25Z',red,1.4,'#f2a6a3','fill-opacity=".65"'),
 fold:()=>path('M3 22 L15 29 28 22 V6 L15 13 3 6Z',ink,1.3,'url(#side)')+path('M3 6 L15 13 28 6',amber,2)+line(15,13,15,29),
 flat:()=>poly([[3,11],[10,7],[17,11],[24,7],[29,11],[22,16],[22,25],[10,25],[10,16]])+dash('M10 16 H22 M10 7 V16 M22 7 V16'),
 boss:()=>plane(3,22)+cyl(16,8,6,11)+circle(16,8,2.6,'#315a70',ink),
 snap:()=>path('M3 26 V8 H16 V15 H10 V26Z M19 26 V16 H25 V7 H29 V26Z',ink,1.3,'url(#side)')+arrow(14,12,24,12,blue),
 joint, gear, paper,
 select:()=>path('M7 3 L26 17 17 19 13 28 10 21Z',ink,1.5,'#d4e9f1'),
 window:()=>dash('M3 5 H28 V27 H3Z')+path('M13 10 L25 20 19 21 16 28Z',ink,1.3,'#d4e9f1'),
 paint:()=>path('M7 23 L22 4 27 8 13 27Z',ink,1.3,'url(#side)')+path('M7 23 Q2 25 3 30 Q10 31 13 27Z',blue,1.2,'#86bcd4'),
 filter:()=>path('M4 5 H28 L19 17 V28 L13 25 V17Z',ink,1.3,'url(#top)'),
 measure:()=>path('M3 23 L23 3 29 9 9 29Z',ink,1.3,'#f6d08a')+[0,1,2,3,4].map(i=>line(8+i*4,20-i*4,11+i*4,23-i*4,ink,1)).join(''),
 section:()=>cube(4,6,13)+path('M5 12 L16 18 V30 L5 24Z',red,1.4,'#f3ceab')+[0,1,2].map(i=>line(6,16+i*3,14,20+i*3,red,1)).join(''),
 analysis:()=>surfaceAnalysis(),
 graph:()=>line(4,27,28,27)+line(4,27,4,4)+path('M5 23 L12 13 18 19 27 6',blue,2)+dots([12,13],[18,19],[27,6]),
 table:()=>rect(4,4,24,24,'#f4f8f9',ink)+rect(4,4,24,6,'#9ecbe0',ink)+grid(blue),
 insert:()=>paper()+arrow(3,17,15,17,green),
 image:()=>rect(3,5,26,22,'#d9edf4',ink)+circle(22,11,3,amber,ink)+path('M5 24 L13 12 20 21 24 16 28 24Z',green,1.1,'#9cc9ac'),
 importmesh:()=>mesh()+arrow(2,16,12,16,green),
 print:()=>rect(5,10,22,15,'#bbdcea',ink,2)+rect(9,3,14,9,'#fff',ink)+rect(9,21,14,8,'#fff',ink)+dots([23,15]),
 zoomin:()=>circle(13,13,9,'#d7ecf4',blue,2)+line(20,20,28,28,ink,3)+path('M8 13 H18 M13 8 V18',blue,2),
 zoomout:()=>circle(13,13,9,'#d7ecf4',blue,2)+line(20,20,28,28,ink,3)+line(8,13,18,13,blue,2),
 orbit:()=>sphere()+path('M3 16 A14 7 0 0 0 29 16',blue,2)+arrow(24,22,29,16,blue),
 fit:()=>path('M3 11 V3 H11 M21 3 H29 V11 M29 21 V29 H21 M11 29 H3 V21',blue,2)+cube(9,8,8),
 history:()=>circle(16,16,11,'#d7ecf4',blue)+path('M16 7 V16 L23 20',ink,2)+arrow(4,9,9,4,blue),
 link:()=>joint()+path('M7 9 Q16 1 25 9 M7 25 Q16 33 25 25',blue,1.4),
 check:()=>circle(16,16,12,'#d7eee5',green)+check(),
 info:()=>circle(16,16,12,'#e2edf4',blue)+letters('i',16,23,22,blue),
 generic:()=>cube(5,3,14)
};
function surfaceAnalysis(){return path('M3 24 Q13 2 29 11 L29 24 Q16 17 3 29Z',ink,1.2,'#e3ebf2')+[0,1,2,3].map(i=>path('M'+(6+i*5)+' 24 Q'+(9+i*4)+' '+(6+i)+' '+(15+i*3)+' 12',[blue,green,amber,red][i],2)).join('')}
const direct={DrawPolyline:'line',SketchMidpointLine:'midpoint',ShapeRectangleTwoPoint:'rect2',ShapeRectangleThreePoint:'rect3',ShapeRectangleCenter:'rectcenter',CircleCenterRadius:'circlecenter',CircleTwoPoint:'circle2',CircleThreePoint:'circle3',CircleTanTanRadius:'circletan2',CircleThreeTangent:'circletan3',ArcThreePoint:'arc3',ArcCenterTwoPoint:'arccenter',ArcTangent:'arctan',ShapePolygonCircumscribed:'polygonout',ShapePolygonInscribed:'polygonin',ShapePolygonEdge:'polygon',CircleElipse:'ellipse',ShapeSlotCenterToCenter:'slot',ShapeSlotOverall:'slotend',ShapeSlotCenterPoint:'slotcenter',ShapeArcSlotThreePoint:'arcslot',ShapeArcSlotCenterTwoPoint:'arcslot',DrawSpline:'spline',DrawCVMSpline3D:'controlspline',DrawCVMSpline5D:'controlspline',ConicCurveCmd:'conic',DrawPoint:'point',MTextCmd:'text',SketchDimension:'dimension',FilletSketchCmd:'fillet2',ChamferSketchEqualDistance:'chamfer2',ChamferSketchDistanceAngle:'chamfer2',ChamferSketchDistanceDistance:'chamfer2',Offset:'offset',TrimSketchCmd:'trim',ExtendSketchCmd:'extend',BreakSketchCmd:'break',SketchScaleCmd:'scale',ConstraintHorizontalVertical:'hv',ConstraintCoincident:'coincident',ConstraintTangent:'tangent',ConstraintEqual:'equal',ConstraintParallel:'parallel',ConstraintPerpendicular:'perpendicular',ConstraintFix:'fix',ConstraintMidPoint:'midpoint',ConstraintConcentric:'concentric',ConstraintCollinear:'line',ConstraintSymmetry:'symmetry',ConstraintSmooth:'spline',SketchPolygonConstraintCmd:'polygon',SketchCreate:'sketch',SketchStop:'finish',SketchAutoConstrainAndFinish:'finish',Extrude:'extrude',SurfaceExtrude:'extrude',Revolve:'revolve',SurfaceRevolve:'revolve',Sweep:'sweep',SurfaceSweep:'sweep',SolidLoft:'loft',SurfaceLoft:'loft',FusionRibCommand:'rib',FusionWebCommand:'rib',FusionHoleCommand:'hole',FusionThreadCommand:'thread',FusionFilletEdgesCommand:'fillet',FusionChamferCommand:'chamfer',FusionShellBodyCommand:'shell',FusionDraftCommand:'draft',FusionCombineCommand:'combine',FusionSplitFaceCommand:'split',FusionSplitBodyCommand:'split',FusionPressPullCommand:'face',FusionOffsetFacesCommand:'face',EditFaceCommand:'face',FusionMoveCommand:'move',AlignCmd:'align',AppearanceCommand:'material',PhysicalMaterialCommand:'material',MeasureCommand:'measure',FusionHalfSectionViewCommand:'section',SelectCommand:'select',selectWindow:'window',selectPaint:'paint',selectFreeForm:'spline',SelectionFilterCommand:'filter',FusionSurfaceStitchCommand:'stitch',FusionSurfaceUnStitchCommand:'stitch',FusionSurfaceReverseNormalCommand:'normal',FusionSurfacePatchCommand:'surface',FusionBossCommand:'boss',FusionSnapFitCommand:'snap',ThreeDprintCmdDef:'print',__fms_zoom_in__:'zoomin',__fms_zoom_out__:'zoomout',__fms_fit__:'fit',__fms_orbit_left__:'orbit',__fms_orbit_right__:'orbit',__fms_orbit_up__:'orbit',__fms_orbit_down__:'orbit'};
const rules=[
 [/mirror|symmetry/i,'mirror'],[/circular.*pattern|patterncircular/i,'circular'],[/patternonpath/i,'pathpattern'],[/pattern|arrange/i,'pattern'],[/primitivebox/i,'box'],[/primitivecylinder/i,'cylinder'],[/primitivesphere/i,'sphere'],[/primitivetorus/i,'torus'],[/primitivecoil/i,'coil'],[/primitivepipe/i,'pipe'],[/constructionplane/i,'plane'],[/constructionaxis|coordinatesystem/i,'axis'],[/constructionpoint|centerofmass/i,'constructpoint'],[/sheetmetal.*fillet/i,'fillet'],[/sheetmetal.*chamfer/i,'chamfer'],[/flatpattern|unfold/i,'flat'],[/sheetmetal.*rule|plasticrule/i,'gear'],[/sheetmetal|fold|flange|joinbybend/i,'fold'],[/mesh.*cut/i,'cutmesh'],[/mesh.*hollow/i,'shell'],[/mesh.*combine/i,'combine'],[/mesh.*scale/i,'scale'],[/mesh.*align/i,'align'],[/mesh.*normal/i,'normal'],[/mesh.*insert/i,'importmesh'],[/mesh/i,'mesh'],[/project|include3d/i,'project'],[/intersect/i,'intersect'],[/surface.*trim/i,'trim'],[/surface.*offset/i,'offset'],[/surface.*extend|fusionextend/i,'extend'],[/surface|tspline|blendg1|spunprofile/i,'surface'],[/loft/i,'loft'],[/scale/i,'scale'],[/move|drag/i,'move'],[/delete|remove|erase|disable/i,'delete'],[/split/i,'split'],[/joint|mate|constraint/i,'joint'],[/contact|link|connection/i,'link'],[/select.*window|boundary/i,'window'],[/select/i,'select'],[/dimension|tolerance/i,'dimension'],[/hole/i,'hole'],[/thread|fastener/i,'thread'],[/decal|canvas/i,'image'],[/import|insert|derive/i,'insert'],[/curvature|zebra|analysis|interference|validate/i,'analysis'],[/history|timeline|snapshot|positions/i,'history'],[/graph|statistics|dashboard|motion/i,'graph'],[/config.*table|bom|palette/i,'table'],[/rule|parameter|manage|compute|setting|config|script/i,'gear'],[/create.*component|assembly|basefeature|enclosure|modeling/i,'box'],[/note|documentation|task|release|details|order|number/i,'paper'],[/apihelp|advice|help/i,'info'],[/check|finish|confirm/i,'check'],[/text/i,'text'],[/lip|rest/i,'rib']
];

const referenceBodies={
 circlecenter:()=>circle(16,16,11.5,'none',sketchInk,1.55)+arrow(16,16,24,7,sketchBlue)+arrow(16,16,8,25,sketchBlue)+nodes([16,16]),
 circle2:()=>circle(16,16,11.5,'none',sketchInk,1.55)+nodes([16,4.5],[16,27.5]),
 circle3:()=>circle(16,16,11.5,'none',sketchInk,1.55)+nodes([7,8],[27,14],[10,26]),
 circletan2:()=>sketchLine('M4 3 V28 H29',1.7)+circle(15,17,11,'none',sketchBlue,1.65)+nodes([4,17],[15,28]),
 circletan3:()=>sketchLine('M3 13 L15 3 L29 24 M3 13 L9 30 L29 24')+circle(15,17,9,'none',sketchInk,1.45)+nodes([8,11],[23,13],[17,26]),
 arccenter:()=>sketchLine('M4 27 A23 23 0 0 1 28 4')+sketchDash('M28 27 H4 M28 27 V4')+nodes([28,27],[4,27],[28,4]),
 polygonout:()=>sketchLine('M16 3 L28 9 V23 L16 29 L4 23 V9 Z')+circle(16,16,10,'none',sketchBlue,1.5)+nodes([16,16],[26,16]),
 polygonin:()=>circle(16,16,13,'none',sketchInk,1.5)+path('M16 3 L28 10 V22 L16 29 L4 22 V10 Z',sketchBlue,1.4)+nodes([16,16],[16,3]),
 polygon:()=>sketchLine('M16 3 L28 11 L24 26 H8 L4 11 Z')+line(8,26,24,26,sketchBlue,2)+nodes([8,26],[24,26]),
 ellipse:()=>'<ellipse cx="16" cy="17" rx="12" ry="8.5" fill="none" stroke="'+sketchInk+'" stroke-width="1.55"/>'+path('M16 8 V26 M4 17 H28',sketchBlue,1.3,'none','stroke-dasharray="2 2"')+nodes([16,17],[28,17],[16,8]),
 slot:()=>rect(3,8,26,16,'none',sketchInk,8)+sketchDash('M11 16 H21')+nodes([11,16],[21,16],[21,8]),
 slotend:()=>rect(3,8,26,16,'none',sketchInk,8)+nodes([3,16],[29,16],[16,8]),
 slotcenter:()=>rect(3,8,26,16,'none',sketchInk,8)+sketchDash('M11 16 H21')+nodes([16,16],[21,16],[21,8]),
 sketchmirror:()=>sketchLine('M3 27 L13 4 V27 Z')+path('M19 4 L29 27 H19 Z',sketchBlue,1.6)+sketchDash('M16 2 V30'),
 sketchcircular:()=>[0,1,2,3].map(i=>rect(16+10*Math.cos(i*Math.PI/2)-3,16+10*Math.sin(i*Math.PI/2)-3,6,6,sketchBlue,sketchInk,.4)).join(''),
 sketchpattern:()=>[0,1].flatMap(y=>[0,1].map(x=>rect(5+x*16,5+y*16,6,6,'none',sketchBlue,.3))).join('')+sketchDash('M11 8 H21 M8 11 V21 M24 11 V21 M11 24 H21'),
 dimension:()=>sketchLine('M4 6 V29 M28 6 V29')+arrow(16,11,4,11,sketchBlue)+arrow(16,11,28,11,sketchBlue),
 fillet2:()=>sketchLine('M4 29 V16 M16 4 H29')+path('M4 16 Q4 4 16 4',sketchBlue,1.9),
 trim:()=>sketchLine('M3 8 H29 M15 8 V29',1.5)+path('M15 8 H29',sketchBlue,1.6,'none','stroke-dasharray="2 2"')+circle(17,22,3,'none',sketchInk,1.4)+circle(24,25,3,'none',sketchInk,1.4)+sketchLine('M18 20 L27 11 M23 23 L14 11'),
 extend:()=>sketchLine('M4 25 H18 M28 7 V29')+path('M18 25 H28',sketchBlue,1.8,'none','stroke-dasharray="2 2"')+arrow(18,25,27,25,sketchBlue),
 break:()=>sketchLine('M3 16 H29')+line(16,4,16,28,sketchBlue,1.9)+nodes([16,16]),
 scale2:()=>rect(4,4,24,24,'none',sketchBlue,.4)+rect(4,16,12,12,'none',sketchInk,.2),
 offset2:()=>sketchLine('M29 8 H13 A8 8 0 0 0 13 24 H29')+path('M29 3 H13 A13 13 0 0 0 13 29 H29',sketchBlue,1.55),
 move:()=>arrow(16,16,16,3,sketchInk)+arrow(16,16,29,16,sketchInk)+arrow(16,16,16,29,sketchInk)+arrow(16,16,3,16,sketchInk)
};

Object.assign(referenceBodies,{
 line:()=>sketchLine("M3 25 H21 C32 25 31 7 21 7 H18",1.65)+nodes([3,25],[21,25],[18,7]),
 rect2:()=>sketchLine("M4 6 H28 V26 H4 Z",1.65)+nodes([4,6],[28,26]),
 rect3:()=>sketchLine("M4 15 L17 3 L28 16 L15 29 Z",1.65)+nodes([4,15],[17,3],[28,16]),
 rectcenter:()=>sketchLine("M4 7 H28 V25 H4 Z",1.65)+nodes([16,16],[28,25]),
 arc3:()=>sketchLine("M4 27 A23 23 0 0 1 28 5",1.65)+nodes([4,27],[11,13],[28,5]),
 arctan:()=>sketchLine("M3 11 H13 Q27 11 29 25",1.65)+nodes([3,11],[13,11],[29,25]),
 spline:()=>sketchLine("M3 27 C6 -2 13 9 18 18 S26 29 29 4",1.65)+nodes([3,27],[9,8],[21,22],[29,4]),
 conic:()=>sketchLine("M4 27 Q16 -17 28 27",1.65)+nodes([4,27],[16,5],[28,27]),
 point:()=>sketchLine("M3 16 H29 M16 3 V29",1.65)
});

Object.assign(referenceBodies,{
 extrudeSolid:()=>path('M3 8 L10 2 H29 V24 L22 30 H3Z',ink,1.25,'#58a9db')+path('M3 8 H22 V30 H3Z','#307aa5',1.2,'#89cbec')+path('M22 8 L29 2 V24 L22 30Z',ink,1,'#337faa')+path('M3 8 L10 2 H29 L22 8Z',ink,1,'#b4e0f3'),
 revolveSolid:()=>cyl(16,12,13,12)+path('M4 9 Q16 2 28 9',ink,1.5)+path('M4 9 H28',blue,1.5)+arrow(6,25,12,29,blue),
 sweepSolid:()=>path('M3 23 H15 V12 H29 V3 H12 V13 H3Z',ink,1.3,'#58addb')+path('M3 23 H13 V30 H3Z',ink,1.2,'#d3d8da')+path('M13 23 L20 16 H29 V23 L20 30 H13Z',ink,1.2,'#d8dde0'),
 loftSolid:()=>path('M3 5 H29 Q27 18 21 27 H11 Q5 18 3 5Z',ink,1.3,'#6cb9e5')+path('M3 5 Q16 -1 29 5 Q16 12 3 5Z',ink,1.1,'#bee5f5')+circle(16,25,4,'#e3e6e8',ink,1.1),
 ribSolid:()=>path('M3 3 V28 H29Z',ink,1.3,'#d5dbdf')+path('M3 3 L12 7 29 24 L29 28 L3 11Z',ink,1.15,'#5faedf')+line(3,3,3,28,blue,2),
 webSolid:()=>rect(3,3,26,26,'#b5bec5',ink,.2)+rect(7,7,18,18,'#e8edf0',ink,.1)+path('M9 22 L16 9 L24 22 M9 16 H23',blue,2.6),
 embossSolid:()=>path('M2 12 Q16 0 30 12 L23 30 Q16 18 9 30Z',ink,1.2,'#e4e7ea')+path('M5 11 L14 4 19 10 26 5 29 11 19 18 14 12 9 16Z',blue,1.2,'#7bbce1'),
 bossSolid:()=>path('M6 30 V12 Q3 10 3 6 Q3 1 10 1 H22 Q29 1 29 6 Q29 10 26 12 V30 H20 V15 H12 V30Z',ink,1.2,'#83c8eb')+circle(16,7,5,'#dfe7e9',ink,1.3)+path('M12 13 V28 M20 13 V28',blue,1.5),
 snapSolid:()=>path('M4 30 V4 H15 V11 H10 V19 H17 V30Z',ink,1.2,'#b9c2c9')+path('M20 30 V14 H14 V8 L24 2 H29 V30Z',ink,1.2,'#62b1df'),
 restSolid:()=>path('M3 29 V22 H12 V13 H21 V4 H30 V12 H23 V21 H14 V29Z',ink,1.2,'#75bde6')+path('M3 22 H12 V13 H21 V4',blue,2.2)+line(13,29,29,29,ink),
 lipSolid:()=>path('M3 5 H16 V11 H23 V17 H29 V27 H13 V21 H7 V15 H3Z',ink,1.2,'#82c5e8')+path('M3 5 H16 V11 H23 V17 H29',blue,2),
 boxSolid:()=>path('M3 9 L10 2 H29 V23 L22 30 H3Z',ink,1.2,'#68b6e4')+path('M3 9 H22 V30 H3Z',blue,1,'#8ccdef')+path('M22 9 L29 2 V23 L22 30Z',ink,1,'#3990be')+path('M3 9 L10 2 H29 L22 9Z',ink,1,'#bfe5f6'),
 cylinderSolid:()=>cyl(16,6,13,20),
 sphereSolid:()=>circle(16,16,13,'url(#ball)',blue,1.2),
 torusSolid:()=>'<ellipse cx="16" cy="16" rx="14" ry="11" fill="#69b7e3" stroke="'+ink+'" stroke-width="1.2"/><ellipse cx="16" cy="16" rx="5.6" ry="4.1" fill="#edf4f8" stroke="'+ink+'" stroke-width="1.1"/>'+path('M3 15 Q16 5 29 15','#b9e4f4',1.5),
 coilSolid:()=>[0,1,2,3].map(i=>path('M5 '+(5+i*6)+' C28 '+(i*6)+' 33 '+(10+i*6)+' 5 '+(12+i*6),ink,4,'none')+path('M5 '+(5+i*6)+' C28 '+(i*6)+' 33 '+(10+i*6)+' 5 '+(12+i*6),'#71c1ed',2.8)).join(''),
 pipeSolid:()=>'<g transform="rotate(-29 16 16)">'+cyl(16,9,8,14)+circle(16,9,3.7,'#d8edf4',blue,1.1)+'</g>',
 pressSolid:()=>path('M3 5 L13 2 V26 L3 30Z',ink,1.2,'#e3e6e8')+path('M13 2 L23 5 V29 L13 26Z',ink,1.2,'#66b8e2')+arrow(19,16,30,16,blue),
 filletSolid:()=>path('M3 3 H16 Q29 3 29 16 V29 H3Z',ink,1.3,'#d4dadd')+path('M16 3 Q29 3 29 16 H21 Q21 11 16 11Z',blue,1.4,'#74c1ed')+path('M3 3 H16 V11 H3Z',ink,1,'#a8c8d9'),
 chamferSolid:()=>path('M3 3 H16 L29 16 V29 H3Z',ink,1.3,'#d4dadd')+path('M16 3 L29 16 H19 L10 8Z',blue,1.4,'#65b8e5')+path('M3 3 H16 L10 8 H3Z',ink,1,'#b2d4e7'),
 shellSolid:()=>rect(3,3,26,26,'#c7d0d7',ink,.3)+rect(9,9,14,14,'#2c4d60',ink,.2)+path('M3 3 H29 V9 H9 V29 H3Z',blue,1.3,'#6fbde7'),
 draftSolid:()=>path('M3 29 L7 8 L16 3 L27 10 L29 29Z',ink,1.3,'#d2d8dd')+path('M7 8 L16 3 L27 10 L23 29 H3Z',blue,1.3,'#6bb9e4')+line(16,3,19,29,ink),
 scaleSolid:()=>rect(3,3,26,26,'#75bde7',ink,.2)+rect(7,12,15,15,'#e4e7e9',ink,.2),
 combineSolid:()=>rect(3,11,17,18,'#58aadd',ink,.4)+rect(12,3,17,18,'#83c6e9',ink,.4)+rect(12,11,8,10,'#a7d9ef',blue,.3),
 offsetSolid:()=>rect(4,7,21,21,'#cdd5da',ink,.2)+rect(9,3,21,21,'none',blue,.2)+rect(9,3,21,4,'#78c2e8',blue,.2),
 replaceSolid:()=>rect(3,4,26,13,'#7ac3e8',ink,.3)+rect(3,22,26,7,'#ccd5dc',ink,.3)+arrow(10,23,10,10,blue)+arrow(22,23,22,10,blue),
 splitFaceSolid:()=>rect(3,3,26,15,'#72c1e9',ink,.2)+rect(3,20,26,9,'#d9dfe3',ink,.2)+line(3,18,29,18,blue,1.8),
 splitBodySolid:()=>path('M3 5 L25 2 29 7 V14 H3Z',ink,1.2,'#75c1e9')+path('M3 20 H29 V25 L25 30 H3Z',ink,1.2,'#c8d3da')+line(3,17,29,17,blue,2),
 silhouetteSolid:()=>circle(16,16,13,'#bfcbd3',ink,1.25)+path('M3 14 Q16 23 29 14 Q28 25 16 25 Q4 25 3 14Z',blue,1.3,'#71bce7'),
 alignSolid:()=>rect(3,3,12,8,'#dce3e7',ink,.1)+rect(3,17,26,12,'#75c0e7',ink,.2)+dash('M3 14 H29',blue)
});
export const referenceIcons=Object.freeze({
  "DrawPolyline": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/polyline.png",
    "kind": "line",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeRectangleTwoPoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/rectangle-2-point.png",
    "kind": "rect2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeRectangleThreePoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/rectangle-3-point.png",
    "kind": "rect3",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeRectangleCenter": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/rectangle-center.png",
    "kind": "rectcenter",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleCenterRadius": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-center-diameter.png",
    "kind": "circlecenter",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleTwoPoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-2-point.png",
    "kind": "circle2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleThreePoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-3-point.png",
    "kind": "circle3",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleTanTanRadius": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-2-tangent.png",
    "kind": "circletan2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleThreeTangent": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-3-tangent.png",
    "kind": "circletan3",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ArcThreePoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/arc-3-point.png",
    "kind": "arc3",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ArcCenterTwoPoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/arc-center-point.png",
    "kind": "arccenter",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ArcTangent": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/arc-tangent.png",
    "kind": "arctan",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapePolygonCircumscribed": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/polygon-circumscribed.png",
    "kind": "polygonout",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapePolygonInscribed": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/polygon-inscribed.png",
    "kind": "polygonin",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapePolygonEdge": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/polygon-edge.png",
    "kind": "polygon",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircleElipse": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/circle-ellipse.png",
    "kind": "ellipse",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeSlotCenterToCenter": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/slot-center-center.png",
    "kind": "slot",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeSlotOverall": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/slot-overall.png",
    "kind": "slotend",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ShapeSlotCenterPoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/slot-center-point.png",
    "kind": "slotcenter",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "DrawSpline": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/spline-fit-point.png",
    "kind": "spline",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ConicCurveCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/conic-curve.png",
    "kind": "conic",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "DrawPoint": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/point.png",
    "kind": "point",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "MirrorSketchCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/mirror.png",
    "kind": "sketchmirror",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "CircularSketchPatternCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/common/pattern-circular.png",
    "kind": "sketchcircular",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "RectangularSketchPatternCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/pattern-rectangular.png",
    "kind": "sketchpattern",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "SketchDimension": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/dimension.png",
    "kind": "dimension",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FilletSketchCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/fillet.png",
    "kind": "fillet2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "TrimSketchCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/trim.png",
    "kind": "trim",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ExtendSketchCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/extend.png",
    "kind": "extend",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "BreakSketchCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/break.png",
    "kind": "break",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "SketchScaleCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/scale.png",
    "kind": "scale2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "Offset": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/skt/offset.png",
    "kind": "offset2",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionMoveCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-GenerativeDesign/images/icon/common/move.png",
    "kind": "move",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "Extrude": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/extrude.png",
    "kind": "extrudeSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "Revolve": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/revolve.png",
    "kind": "revolveSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "Sweep": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/sweep.png",
    "kind": "sweepSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "SolidLoft": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/loft.png",
    "kind": "loftSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionRibCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/rib.png",
    "kind": "ribSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionWebCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/web.png",
    "kind": "webSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "EmbossCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/emboss.png",
    "kind": "embossSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionBossCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/boss.png",
    "kind": "bossSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionSnapFitCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/snap-fit.png",
    "kind": "snapSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionRestCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/rest.png",
    "kind": "restSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionLipCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/lip-groove.png",
    "kind": "lipSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitiveBox": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/box.png",
    "kind": "boxSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitiveCylinder": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/cylinder.png",
    "kind": "cylinderSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitiveSphere": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/sphere.png",
    "kind": "sphereSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitiveTorus": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/torus.png",
    "kind": "torusSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitiveCoil": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/coil.png",
    "kind": "coilSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "PrimitivePipe": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/pipe.png",
    "kind": "pipeSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionPressPullCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/press-pull.png",
    "kind": "pressSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionFilletEdgesCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/fillet.png",
    "kind": "filletSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionChamferCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/chamfer.png",
    "kind": "chamferSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionShellBodyCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/shell.png",
    "kind": "shellSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionDraftCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/draft.png",
    "kind": "draftSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "ModifyScale": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/scale.png",
    "kind": "scaleSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionCombineCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/combine.png",
    "kind": "combineSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionOffsetFacesCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/offset-faces.png",
    "kind": "offsetSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionReplaceFaceCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/replace-face.png",
    "kind": "replaceSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionSplitFaceCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/split-face.png",
    "kind": "splitFaceSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionSplitBodyCommand": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/split-body.png",
    "kind": "splitBodySolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "FusionPartingLineSplitCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/sld/silhouette-split.png",
    "kind": "silhouetteSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  },
  "AlignCmd": {
    "source": "https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/images/icon/common/align.png",
    "kind": "alignSolid",
    "reference": "official-help-image-opened",
    "review": "redrawn-reference-not-pixel-verified"
  }
});
export const styles=Object.freeze([...new Set([...Object.keys(bodies),...Object.keys(referenceBodies)])]);
export function iconKind(id,meta={}){if(Object.hasOwn(referenceIcons,id))return referenceIcons[id].kind;if(direct[id]&&Object.hasOwn(direct,id))return direct[id];for(const [pattern,kind] of rules)if(pattern.test(id))return kind;const panel=meta.panel||'';if(panel==='검사')return 'analysis';if(panel==='삽입')return 'insert';if(panel==='선택')return 'select';if(panel==='조립')return 'joint';if(panel==='수정')return 'face';if(panel==='작성')return 'sketch';return 'generic'}
const defs='<defs><linearGradient id="side" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#b1dce9"/><stop offset="1" stop-color="#5b9cba"/></linearGradient><linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eef9fb"/><stop offset="1" stop-color="#a9d6e5"/></linearGradient><radialGradient id="ball" cx=".3" cy=".25" r=".8"><stop stop-color="#edf9fc"/><stop offset="1" stop-color="#65a4bf"/></radialGradient></defs>';
export function iconSvg(id,meta={}){return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">'+defs+(Object.hasOwn(referenceIcons,id)?referenceBodies[referenceIcons[id].kind]:bodies[iconKind(id,meta)])()+'</svg>'}
const cache=new Map();
export function iconUrl(id,meta={}){const kind=(Object.hasOwn(referenceIcons,id)?'ref:':'')+iconKind(id,meta);if(!cache.has(kind))cache.set(kind,'data:image/svg+xml,'+encodeURIComponent(iconSvg(id,meta)));return cache.get(kind)}
