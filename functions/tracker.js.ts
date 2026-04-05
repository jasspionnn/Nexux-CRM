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
        T._clicks();
      },
      track:function(name,data){
        T._send('conversion',{en:name,d:data||{}});
      },
      _send:function(type,data){
        if(!T.id){return;}
        var p={tracking_id:T.id,event_type:type,url:data.url||w.location.href,referrer:data.ref||document.referrer||null,visitor_id:T.vid,ts:new Date().toISOString()};
        if(data.en)p.event_name=data.en;
        if(data.d)p.data=data.d;
        if(data.form_data)p.form_data=data.form_data;
        if(type==='conversion')console.log('[NX] Conversion:',data.en||'unknown',p);
        if(type==='form')console.log('[NX] Form submit:',data.form_data?p.form_data.fid:'unknown');
        fetch(T.url+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),mode:'no-cors',credentials:'omit'}).catch(function(){});
      },
      _pv:function(){T._send('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _forms:function(){
        var convKeywords=['email','phone','tel','whatsapp','nome','name','cpf','celular'];
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          var fd={};
          var hasConv=false;
          for(var i=0;i<f.elements.length;i++){
            var el=f.elements[i];
            if(el.name&&el.type!=='submit'&&el.type!=='button'&&el.type!=='hidden'){
              if(el.type==='checkbox'||el.type==='radio'){if(el.checked)fd[el.name]=el.value;}
              else{fd[el.name]=el.value;}
              var lk=(el.name+(el.placeholder||'')+(el.getAttribute('aria-label')||'')).toLowerCase();
              for(var j=0;j<convKeywords.length;j++){if(lk.indexOf(convKeywords[j])!==-1){hasConv=true;break;}}
            }
          }
          T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:f.id||'unknown',action:f.action||f.getAttribute('action')||'no-action',fields:fd}});
          if(hasConv){T._send('conversion',{en:'lead_capturado',d:{form:f.id||'unknown',fields:Object.keys(fd).join(',')}});}
        },true);
      },
      _clicks:function(){
        document.addEventListener('click',function(e){
          var el=e.target.closest('[data-track-conversion]');
          if(el){T._send('conversion',{en:el.getAttribute('data-track-conversion')||'click_conversion',d:{label:el.textContent||'',tag:el.tagName}});}
        },true);
      }
    };
    w.NexuxTracker=T;
  })(window);`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
