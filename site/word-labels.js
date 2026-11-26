// Preserve whole whitespace-delimited words, including Korean and hyphenated English.
export function words(value){return String(value??'').trim().split(/\s+/u).filter(Boolean)}
export function fittedSize(base,width,longest){return longest>width&&width>0?Math.max(.1,Math.floor(base*width/longest*10)/10):base}
export function setWordLabel(el,value){
  const tokens=words(value);
  el.replaceChildren();
  for(const [i,word] of tokens.entries()){
    if(i)el.append(document.createTextNode(' '));
    const span=document.createElement('span');span.className='whole-word';span.textContent=word;el.append(span);
  }
  el.classList.add('word-label');el.title=String(value??'');
}
let frame=0;
export function fitLabels(){
  if(frame)return;
  frame=requestAnimationFrame(()=>{
    frame=0;
    const labels=[...document.querySelectorAll('.word-label')];
    for(const el of labels)el.style.removeProperty('font-size');
    const plans=labels.map(el=>{
      const s=getComputedStyle(el),base=parseFloat(s.fontSize),width=el.clientWidth-parseFloat(s.paddingLeft||0)-parseFloat(s.paddingRight||0);
      const longest=Math.max(0,...[...el.children].map(w=>w.getBoundingClientRect().width));
      return [el,fittedSize(base,Math.max(0,width-1),longest),base];
    });
    for(const [el,size,base] of plans)if(size<base)el.style.fontSize=size+'px';
  });
}
export function watchLabels(root=document.body){
  // Only width changes trigger refitting; changed row heights do not.
  let width=-1,left=-1,right=-1;
  const observer=new ResizeObserver(()=>{
    const w=root.clientWidth,l=document.querySelector('.left')?.clientWidth??0,r=document.querySelector('.right')?.clientWidth??0;
    if(w!==width||l!==left||r!==right){width=w;left=l;right=r;fitLabels()}
  });
  observer.observe(root);for(const e of document.querySelectorAll('.left,.right'))observer.observe(e);
  document.fonts?.ready.then(fitLabels);fitLabels();
}
