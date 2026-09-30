(() => {
 const nav=document.querySelector('.case-navigation');
 if(!nav)return;
 const header=document.querySelector('.portfolio-header');
 let links=[...nav.querySelectorAll('a[href^="#"]')];
 let sections=links.map(link=>document.getElementById(link.hash.slice(1)));
 const compact=matchMedia('(max-width:1180px)');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let pending=false;
 function update(){
  pending=false;
  const headerHeight=header&&!header.classList.contains('is-hidden')?header.offsetHeight:0;
  const navHeight=compact.matches?nav.offsetHeight:0;
  document.body.style.setProperty('--case-header-visible',`${headerHeight}px`);
  document.body.style.setProperty('--case-navigation-height',`${navHeight}px`);
  const readingLine=headerHeight+navHeight+Math.min(150,innerHeight*.2);
  let active=0;
  sections.forEach((section,index)=>{if(section&&section.getBoundingClientRect().top<=readingLine)active=index;});
  links.forEach((link,index)=>{
   if(index===active){
    if(link.getAttribute('aria-current')!=='location'){
     link.setAttribute('aria-current','location');
     if(compact.matches){
      const left=link.offsetLeft-nav.clientWidth/2+link.offsetWidth/2;
      nav.scrollTo({left,behavior:reduced.matches?'auto':'smooth'});
     }
    }
   }else link.removeAttribute('aria-current');
  });
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule);
 addEventListener('hashchange',schedule);
 addEventListener('load',schedule,true);
 document.addEventListener('case-content-ready',()=>{
  links=[...nav.querySelectorAll('a[href^="#"]')];
  sections=links.map(link=>document.getElementById(link.hash.slice(1)));
  schedule();
 });
 compact.addEventListener('change',schedule);
 if(header){new MutationObserver(schedule).observe(header,{attributes:true,attributeFilter:['class']});new ResizeObserver(schedule).observe(header);}
 update();
})();
