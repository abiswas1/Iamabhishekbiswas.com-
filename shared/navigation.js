(() => {
 const header=document.querySelector('.portfolio-header');
 if(!header)return;
 const toggle=header.querySelector('.portfolio-menu-toggle');
 function closeMenu(returnFocus=false){header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation menu');if(returnFocus)toggle.focus();}
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';header.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');});
 header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('menu-open'))closeMenu(true);});
 document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu();});
 document.addEventListener('focusin',event=>{if(!header.contains(event.target))closeMenu();});
 window.matchMedia('(max-width:1100px)').addEventListener('change',()=>closeMenu());
 const isProjectPage=Boolean(document.querySelector('.portfolio-back-row'));
 const scrollTopButton=isProjectPage?document.createElement('button'):null;
 if(scrollTopButton){
  scrollTopButton.className='portfolio-scroll-top';
  scrollTopButton.type='button';
  scrollTopButton.setAttribute('aria-label','Scroll to top');
  scrollTopButton.title='Back to top';
  scrollTopButton.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>';
  document.body.append(scrollTopButton);
  scrollTopButton.classList.toggle('is-visible',window.scrollY>500);
  scrollTopButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
 }
 // Measure deliberate travel in one direction, not each tiny touch/trackpad reversal.
 function scrollPosition(){
  const bottom=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  return Math.min(bottom,Math.max(0,window.scrollY));
 }
 let lastScrollY=scrollPosition();
 let scrollDirection=0;
 let directionTravel=0;
 let headerFramePending=false;
 function resetScrollTracking(){
  lastScrollY=scrollPosition();
  scrollDirection=0;
  directionTravel=0;
 }
 window.addEventListener('scroll',()=>{
  if(headerFramePending)return;
  headerFramePending=true;
  requestAnimationFrame(()=>{
   // Clamp elastic overscroll so the rebound at a page edge is not an upward gesture.
   const y=scrollPosition();
   const change=y-lastScrollY;
   lastScrollY=y;
   if(y<=20||header.classList.contains('menu-open')||header.querySelector(':focus-visible')){
    header.classList.remove('is-hidden');
    scrollDirection=0;
    directionTravel=0;
   }else if(change!==0){
    const direction=Math.sign(change);
    directionTravel=direction===scrollDirection?directionTravel+Math.abs(change):Math.abs(change);
    scrollDirection=direction;
    if(direction>0&&y>120&&directionTravel>=32)header.classList.add('is-hidden');
    else if(direction<0&&directionTravel>=16)header.classList.remove('is-hidden');
   }
   if(scrollTopButton)scrollTopButton.classList.toggle('is-visible',y>500);
   headerFramePending=false;
  });
 },{passive:true});
 window.addEventListener('pageshow',()=>{
  resetScrollTracking();
  header.classList.remove('is-hidden');
  if(scrollTopButton)scrollTopButton.classList.toggle('is-visible',lastScrollY>500);
 });
 // A mobile browser toolbar resizing the viewport should not count as scrolling.
 window.addEventListener('resize',resetScrollTracking,{passive:true});
 header.addEventListener('focusin',()=>{header.classList.remove('is-hidden');resetScrollTracking();});
})();
