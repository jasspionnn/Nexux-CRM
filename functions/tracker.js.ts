export const onRequestGet = async () => {
  const trackerScript = `(function(w){'use strict';var N={t:null,b:null,v:null,ok:false,init:function(t,e){if(this.ok)return;this.t=t;this.b=e.replace(/\\/$/, '');this.v=this._id();this.ok=true;this._p();this._f();},track:function(ev,d){if(!this.ok)return;this._s('conversion',{en:ev,url:w.location.href,ref:document.referrer||null,vid:this.v,d:d||null});},_s:function(type,data){var p={tracking_id:this.t,event_type:type,visitor_id:this.v,url:data.url||w.location.href,referrer:data.ref||document.referrer||null,form_data:data.form_data||data.d||null,ts:new Date().toISOString()};if(navigator.sendBeacon&&type==='pageview'){var b=new Blob([JSON.stringify(p)],{type:'application/json'});navigator.sendBeacon(this.b+'/api/tracking/events',b);}else{fetch(this.b+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true,mode:'no-cors'}).catch(function(){});}},_p:function(){this._s('pageview',{url:w.location.href,referrer:document.referrer||null,title:document.title});},_f:function(){var s=this;document.addEventListener('submit',function(e){var f=e.target;if(!f||f.tagName!=='FORM')return;var fd={};for(var i=0;i<f.elements.length;i++){var el=f.elements[i];if(el.name&&el.type!=='submit'&&el.type!=='button'){if((el.type==='checkbox'||el.type==='radio')&&el.checked)fd[el.name]=el.value;else if(el.type!=='checkbox'&&el.type!=='radio')fd[el.name]=el.value;}}s._s('form',{url:w.location.href,referrer:document.referrer||null,form_data:{fid:f.id||'unknown',fields:fd}});},true);},_id:function(){var id=sessionStorage.getItem('nx_vid');if(!id){id='vis_'+Math.random().toString(36).substring(2,15)+Date.now().toString(36);sessionStorage.setItem('nx_vid',id);}return id;}};w.NexuxTracker=N;})(window);`;

  return new Response(trackerScript, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
