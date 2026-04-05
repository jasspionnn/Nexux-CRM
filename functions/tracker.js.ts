export const onRequestGet = async () => {
  const script = `(function(w){
    var T={
      id:null, url:null, vid:null,
      init:function(tid,base){
        if(T.id)return;
        T.id=tid;
        T.url=base.replace(/\\/$/, '');
        T.vid=sessionStorage.getItem('nx_v');
        if(!T.vid){T.vid='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).substr(2,8);sessionStorage.setItem('nx_v',T.vid);}
        T._pv();
        T._forms();
      },
      track:function(name,data){
        T._send('conversion',{en:name,d:data||{}});
      },
      _send:function(type,data){
        if(!T.id){console.warn('[NX] No tracking ID');return;}
        var p={tracking_id:T.id,event_type:type,url:data.url||w.location.href,referrer:data.ref||document.referrer||null,visitor_id:T.vid,ts:new Date().toISOString()};
        if(data.en)p.event_name=data.en;
        if(data.d)p.data=data.d;
        if(data.form_data)p.form_data=data.form_data;
        fetch(T.url+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),mode:'no-cors'})
          .then(function(){console.log('[NX] Sent:',type);})
          .catch(function(e){console.warn('[NX] Failed:',e);});
      },
      _pv:function(){T._send('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _forms:function(){
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          var fd={};
          for(var i=0;i<f.elements.length;i++){
            var el=f.elements[i];
            if(el.name&&el.type!=='submit'&&el.type!=='button'){
              if(el.type==='checkbox'||el.type==='radio'){if(el.checked)fd[el.name]=el.value;}
              else{fd[el.name]=el.value;}
            }
          }
          T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:f.id||'unknown',action:f.action||null,fields:fd}});
        },true);
      }
    };
    w.NexuxTracker=T;
  })(window);`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
