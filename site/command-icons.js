// Original CAD-style vector artwork for Fusion Macro Studio.
// No Autodesk image assets are included. Local original PNGs override these.
const ink='#26465c', blue='#277fae', pale='#b6e1ef', amber='#e9a23d', red='#d85a50', green='#45956f', violet='#8066bd';
const path=(d,s=ink,w=1.7,f='none',extra='')=>'<path d="'+d+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
const line=(x,y,X,Y,c=ink,w=1.7)=>path('M'+x+' '+y+' L'+X+' '+Y,c,w);
const circle=(x,y,r,f='none',s=ink,w=1.5)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'" stroke="'+s+'" stroke-width="'+w+'"/>';
const rect=(x,y,w,h,f='none',s=ink,r=1)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+f+'" stroke="'+s+'" stroke-width="1.5"/>';
const dots=(...pts)=>pts.map(([x,y])=>circle(x,y,1.85,amber,'#fff',.65)).join('');
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
 line:()=>line(5,25,26,6,blue,2)+dots([5,25],[26,6]),
 midpoint:()=>line(4,25,28,7,blue,2)+dots([4,25],[16,16],[28,7]),
 rect2:()=>rect(5,8,22,17,'#d7ecf4',blue)+dots([5,8],[27,25]),
 rect3:()=>poly([[4,15],[23,6],[29,18],[10,27]])+dots([4,15],[23,6],[29,18]),
 rectcenter:()=>rect(5,6,22,20,'#d7ecf4',blue)+dash('M5 6 L27 26 M27 6 L5 26')+dots([16,16],[27,26]),
 circlecenter:()=>circle(16,16,11,'#d7ecf4',blue,1.8)+line(16,16,26,12,blue)+dots([16,16],[26,12]),
 circle2:()=>circle(16,16,11,'#d7ecf4',blue,1.8)+dash('M5 16 H27')+dots([5,16],[27,16]),
 circle3:()=>circle(16,16,11,'#d7ecf4',blue,1.8)+dots([16,5],[5,16],[24,24]),
 circletan2:()=>line(3,6,28,6)+line(6,6,6,29)+circle(16,16,10,'#d7ecf4',blue)+dots([16,6],[6,16]),
 circletan3:()=>path('M3 5 H29 L16 30Z',ink,1.4)+circle(16,13,8,'#d7ecf4',blue)+dots([16,5],[9,17],[23,17]),
 arc3:()=>path('M4 24 Q8 -2 28 12',blue,2)+dots([4,24],[12,10],[28,12]),
 arccenter:()=>path('M5 23 A17 17 0 0 1 25 5',blue,2)+dash('M24 24 L5 23 M24 24 L25 5')+dots([5,23],[24,24],[25,5]),
 arctan:()=>line(3,25,12,25)+path('M12 25 A14 14 0 0 0 26 8',blue,2)+dots([12,25],[26,8]),
 polygon:()=>poly([[16,4],[27,11],[27,23],[16,29],[5,23],[5,11]])+dots([16,4],[27,11]),
 polygonin:()=>circle(16,16,13,'none',blue,1)+poly([[16,4],[27,11],[27,23],[16,28],[5,23],[5,11]])+dots([16,16]),
 polygonout:()=>poly([[16,3],[28,9],[28,23],[16,29],[4,23],[4,9]])+circle(16,16,10,'none',blue,1)+dots([16,16]),
 ellipse:()=>'<ellipse cx="16" cy="16" rx="12" ry="7.5" transform="rotate(-27 16 16)" fill="#d7ecf4" stroke="'+blue+'" stroke-width="1.8"/>'+dash('M5 22 L27 10')+dots([16,16],[27,10]),
 slot:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dash('M9 16 H23')+dots([9,16],[23,16]),
 slotend:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dots([3,16],[29,16]),
 slotcenter:()=>rect(3,10,26,12,'#d7ecf4',blue,6)+dash('M9 16 H23')+dots([16,16],[23,16]),
 arcslot:()=>path('M5 25 A20 20 0 0 1 25 5 A4 4 0 0 1 25 13 A12 12 0 0 0 13 25 A4 4 0 0 1 5 25Z',blue,1.7,'#d7ecf4')+dots([9,25],[25,9]),
 spline:()=>curves()+dots([3,24],[10,13],[20,17],[29,7]),
 controlspline:()=>curves()+dash('M3 24 L8 3 L17 29 L29 7')+dots([3,24],[8,3],[17,29],[29,7]),
 conic:()=>path('M4 26 Q4 5 28 5',blue,2)+dash('M4 26 L4 5 L28 5')+dots([4,26],[4,5],[28,5]),
 point:()=>line(5,16,27,16,blue,1)+line(16,5,16,27,blue,1)+circle(16,16,3,amber,ink),
 text:()=>letters('T',16,24,25,blue)+line(4,27,28,27,amber,1.3),
 mirror:()=>dash('M16 3 V29')+poly([[5,8],[5,24],[13,18]])+poly([[27,8],[27,24],[19,18]]),
 circular:()=>circle(16,16,10,'none',blue,1)+[0,1,2,3].map(i=>circle(16+10*Math.cos(i*Math.PI/2),16+10*Math.sin(i*Math.PI/2),3.1,'#a8d3e7',ink,1)).join('')+dots([16,16]),
 pattern:()=>[0,1,2].flatMap(y=>[0,1,2].map(x=>rect(4+x*9,4+y*9,6,6,x+y?'#c5e5ef':'#efb45b',blue,1))).join(''),
 pathpattern:()=>curves()+dots([4,23],[12,14],[21,16],[29,7]),
 project:()=>plane(3,23)+path('M5 7 L18 2 27 7 14 12Z',ink,1.4,'#c9b9ed')+arrow(15,11,15,23,violet),
 intersect:()=>plane(2,18)+path('M13 3 L26 10 V27 L13 20Z',blue,1.4,'#b0deea')+line(13,13,25,20,violet,2.4),
 dimension:()=>line(6,6,6,27)+line(26,6,26,27)+line(6,23,26,23,blue)+arrow(16,11,6,11,blue)+arrow(16,11,26,11,blue)+letters('25',16,8,8,ink),
 fillet2:()=>path('M5 27 V14 Q5 5 14 5 H27',blue,2.2)+dash('M5 14 V5 H14')+dots([5,14],[14,5]),
 chamfer2:()=>path('M5 27 V15 L15 5 H27',blue,2.2)+dash('M5 15 V5 H15')+dots([5,15],[15,5]),
 offset:()=>path('M4 24 L4 10 L18 10',ink,1.6)+path('M11 28 V17 H28',blue,2)+arrow(7,12,11,16,amber),
 trim:()=>line(4,23,27,5,blue,2)+line(5,6,26,27)+dash('M16 16 L26 27',red)+cross(16,16),
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
export const styles=Object.freeze(Object.keys(bodies));
export function iconKind(id,meta={}){if(direct[id]&&Object.hasOwn(direct,id))return direct[id];for(const [pattern,kind] of rules)if(pattern.test(id))return kind;const panel=meta.panel||'';if(panel==='검사')return 'analysis';if(panel==='삽입')return 'insert';if(panel==='선택')return 'select';if(panel==='조립')return 'joint';if(panel==='수정')return 'face';if(panel==='작성')return 'sketch';return 'generic'}
const defs='<defs><linearGradient id="side" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#b1dce9"/><stop offset="1" stop-color="#5b9cba"/></linearGradient><linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eef9fb"/><stop offset="1" stop-color="#a9d6e5"/></linearGradient><radialGradient id="ball" cx=".3" cy=".25" r=".8"><stop stop-color="#edf9fc"/><stop offset="1" stop-color="#65a4bf"/></radialGradient></defs>';
export function iconSvg(id,meta={}){return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">'+defs+bodies[iconKind(id,meta)]()+'</svg>'}
const cache=new Map();
export function iconUrl(id,meta={}){const kind=iconKind(id,meta);if(!cache.has(kind))cache.set(kind,'data:image/svg+xml,'+encodeURIComponent(iconSvg(id,meta)));return cache.get(kind)}
