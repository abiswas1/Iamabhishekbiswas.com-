(() => {
 const header=document.querySelector('.portfolio-header');
 const toggle=header.querySelector('.portfolio-menu-toggle');
 const menu=header.querySelector('.portfolio-menu');
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
 let lastScrollY=window.scrollY;
 let headerFramePending=false;
 window.addEventListener('scroll',()=>{
  if(headerFramePending)return;
  headerFramePending=true;
  requestAnimationFrame(()=>{
   const y=window.scrollY;
   const change=y-lastScrollY;
   if(y<=20||change<-6)header.classList.remove('is-hidden');
   else if(y>120&&change>6&&!header.classList.contains('menu-open')&&!header.contains(document.activeElement))header.classList.add('is-hidden');
   if(scrollTopButton)scrollTopButton.classList.toggle('is-visible',y>500);
   if(y<=20||Math.abs(change)>6)lastScrollY=y;
   headerFramePending=false;
  });
 },{passive:true});
 header.addEventListener('focusin',()=>header.classList.remove('is-hidden'));
})();
