/* SuperContent external client solution. Buildless, locally scoped assets. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const narrow = matchMedia('(max-width:900px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const byId = id => document.getElementById(id);
  const clamp = n => Math.min(slides.length - 1, Math.max(0, Math.round(Number(n) || 0)));
  let index = 0, reading = narrow.matches, observer, motionEnabled = !reduced.matches;
  let touchStart = null, readNavigationTarget = null, unlockTimer;
  const seen = new Set();
  const film = byId('consumer-film');
  function updateControls() {
    byId('page-number').textContent = String(index + 1).padStart(2, '0');
    byId('control-title').textContent = slides[index].dataset.title;
    byId('deck-progress').style.width = `${(index + 1) / slides.length * 100}%`;
    byId('prev-button').disabled = index === 0;
    byId('next-button').disabled = index === slides.length - 1;
    byId('mode-button').textContent = reading ? '演示' : '阅读';
    byId('mode-button').setAttribute('aria-label', reading ? '切换到演示模式' : '切换到阅读模式');
    byId('status').textContent = `第 ${index + 1} 页，共 ${slides.length} 页。${slides[index].dataset.title}`;
    document.querySelectorAll('#contents-list button').forEach((button,i) => {
      if (i === index) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
  }
  function syncHash() {history.replaceState(null,'',`#p${index + 1}`);}
  function pauseHiddenFilm() {
    if (!film) return;
    const rect = film.getBoundingClientRect();
    if ((!reading && !film.closest('.slide').classList.contains('active')) || document.hidden || (reading && (rect.bottom <= 0 || rect.top >= innerHeight))) film.pause();
  }
  function navigate(next,sync = true) {
    index = clamp(next);
    if (reading) {
      readNavigationTarget = index;
      clearTimeout(unlockTimer);
      slides[index].scrollIntoView({behavior:motionEnabled && !reduced.matches ? 'smooth':'instant',block:'start'});
      unlockTimer = setTimeout(() => {readNavigationTarget=null;},800);
    } else {
      slides.forEach((slide,i) => {
        slide.classList.toggle('active',i === index);
        slide.inert = i !== index;
        slide.setAttribute('aria-hidden',String(i !== index));
        if (i === index) slide.scrollTop=0;
      });
    }
    if (sync) syncHash();
    updateControls(); pauseHiddenFilm();
  }
  function setMode(next,scroll = true) {
    reading = typeof next === 'string' ? ['read','reading'].includes(next) : Boolean(next);
    document.body.classList.toggle('read-mode',reading);
    document.body.classList.toggle('presentation-mode',!reading);
    observer?.disconnect(); seen.clear();readNavigationTarget=null;
    if (reading) {
      slides.forEach(slide => {slide.inert=false;slide.removeAttribute('aria-hidden');slide.classList.add('active');});
      observer=new IntersectionObserver(entries => {
        entries.forEach(entry => entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target));
        const visibleHeight=slide=>{const r=slide.getBoundingClientRect();return Math.max(0,Math.min(r.bottom,innerHeight-60)-Math.max(r.top,0));};
        const mostVisible=[...seen].sort((a,b)=>visibleHeight(b)-visibleHeight(a))[0];
        if (mostVisible && readNavigationTarget===null) {index=slides.indexOf(mostVisible);syncHash();updateControls();}
        pauseHiddenFilm();
      },{threshold:[0,.1,.25,.4,.6,.8],rootMargin:'0px 0px -60px 0px'});
      slides.forEach(slide=>observer.observe(slide));
      if (scroll) slides[index].scrollIntoView({block:'start'});
    } else {scrollTo(0,0);navigate(index,false);}
    updateControls();
  }
  function setMotion(enabled) {
    motionEnabled=Boolean(enabled)&&!reduced.matches;
    document.body.classList.toggle('motion-off',!motionEnabled);
    byId('motion-button').textContent=motionEnabled ? '动效 开':'动效 关';
    byId('motion-button').setAttribute('aria-pressed',String(motionEnabled));
    byId('motion-button').setAttribute('aria-label',motionEnabled ? '关闭动效':'开启动效');
  }
  async function fullscreen() {
    try {if(document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch {byId('status').textContent='当前浏览器未提供全屏，请使用浏览器的全屏功能。';}
  }
  byId('prev-button').addEventListener('click',()=>navigate(index-1));
  byId('next-button').addEventListener('click',()=>navigate(index+1));
  byId('mode-button').addEventListener('click',()=>setMode(!reading));
  byId('motion-button').addEventListener('click',()=>setMotion(!motionEnabled));
  byId('fullscreen-button').addEventListener('click',fullscreen);
  document.addEventListener('fullscreenchange',()=>byId('fullscreen-button').setAttribute('aria-label',document.fullscreenElement ? '退出全屏':'进入全屏'));
  slides.forEach((slide,i)=>{
    const li=document.createElement('li'), button=document.createElement('button'), number=document.createElement('span');
    button.type='button';number.textContent=String(i+1).padStart(2,'0');button.append(number,document.createTextNode(slide.dataset.title));
    button.addEventListener('click',()=>{byId('contents-dialog').close();navigate(i);});
    li.append(button);byId('contents-list').append(li);
  });
  byId('contents-button').addEventListener('click',()=>byId('contents-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>byId(button.dataset.close).close()));
  const contents=byId('contents-dialog');
  contents.addEventListener('click',event=>{if(event.target===contents){const rect=contents.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)contents.close();}});
  document.addEventListener('keydown',event=>{
    if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|VIDEO/.test(event.target.tagName)||event.metaKey||event.ctrlKey||event.altKey)return;
    if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End',' '].includes(event.key)){
      if(reading&&event.key===' ')return;
      event.preventDefault();navigate(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(['ArrowRight','PageDown',' '].includes(event.key)?1:-1));
    }else if(event.key.toLowerCase()==='f')fullscreen();else if(event.key.toLowerCase()==='p')setMode(!reading);else if(event.key.toLowerCase()==='m')setMotion(!motionEnabled);
  });
  document.addEventListener('touchstart',event=>{touchStart=event.touches.length===1?[event.touches[0].clientX,event.touches[0].clientY]:null;},{passive:true});
  document.addEventListener('touchend',event=>{
    if(reading||!touchStart||document.querySelector('dialog[open]'))return;
    const dx=event.changedTouches[0].clientX-touchStart[0],dy=event.changedTouches[0].clientY-touchStart[1];
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)navigate(index+(dx<0?1:-1));touchStart=null;
  },{passive:true});
  const bars=document.querySelector('.signal-bars');
  for(let i=0;i<34;i++){const bar=document.createElement('i');bar.style.height=`${15+((i*17)%37)}px`;bar.style.animationDelay=`${i*.035}s`;bars?.append(bar);}
  const initial=/^#p(\d+)$/.exec(location.hash);if(initial)index=clamp(Number(initial[1])-1);
  addEventListener('hashchange',()=>{const match=/^#p(\d+)$/.exec(location.hash);if(match)navigate(Number(match[1])-1,false);});
  narrow.addEventListener('change',()=>setMode(narrow.matches));
  reduced.addEventListener('change',()=>setMotion(!reduced.matches));
  document.addEventListener('visibilitychange',pauseHiddenFilm);
  addEventListener('scroll',pauseHiddenFilm,{passive:true});
  setMotion(motionEnabled);setMode(reading,false);navigate(index,false);
  window.ClientDeck={navigate,setMode,setMotion,getState:()=>({index,reading,slides:slides.length,motion:motionEnabled,motionEnabled,version:'v1.3.0-client'}),version:'v1.3.0-client'};
})();
