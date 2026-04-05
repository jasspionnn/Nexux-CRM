export const onRequestGet = async () => {
  const script = `(function(w){
    var T={id:null,b:null,v:null,
      init:function(t,e){
        if(T.id)return;
        T.id=t;
        T.b=e.replace(/\\/$/, '');
        T.v=sessionStorage.getItem('nx_v');
        if(!T.v){T.v='v'+Date.now().toString(36);sessionStorage.setItem('nx_v',T.v);}
        T._pv();
        T._f();
        console.log('[NX] Ready',t);
      },
      track:function(n,d){
        d=d||{};
        // If data has form fields, send as form event
        if(d.fields&&Object.keys(d.fields).length>0){
          T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:d.fid||n,action:w.location.href,fields:d.fields,has_lead:d.has_lead||false}});
        }else if(d.email||d.nome||d.name||d.phone||d.cpf){
          // Direct form fields in data
          T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:n,action:w.location.href,fields:d,has_lead:true}});
        }else{
          T._s('conversion',{en:n,d:d});
        }
      },
      _s:function(ty,d){
        if(!T.id)return;
        var p={tracking_id:T.id,event_type:ty,url:d.url||w.location.href,referrer:d.ref||document.referrer||null,visitor_id:T.v,ts:new Date().toISOString()};
        if(d.en)p.event_name=d.en;
        if(d.d)p.data=d.d;
        if(d.form_data)p.form_data=d.form_data;
        console.log('[NX] Sent:',ty,d.form_data?d.form_data.fid:'',d.form_data?JSON.stringify(d.form_data.fields):'');
        fetch(T.b+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),mode:'no-cors',credentials:'omit'}).catch(function(){});
      },
      _pv:function(){
        T._s('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});
      },
      _f:function(){
        var ck=['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'];
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          if(f._nx)return;
          f._nx=true;
          var fd={},hl=false;
          for(var i=0;i<f.elements.length;i++){
            var el=f.elements[i];
            if(el.name&&el.type!=='submit'&&el.type!=='button'&&el.type!=='hidden'){
              fd[el.name]=(el.type==='checkbox'||el.type==='radio')?(el.checked?el.value:''):el.value;
              var lk=el.name.toLowerCase();
              for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}
            }
          }
          if(Object.keys(fd).length>0){
            // Use form NAME attribute as primary identifier, fallback to ID or hash
            var fid=f.name||f.id||('form_'+T._h(f.action||w.location.pathname));
            console.log('[NX] Form captured:',fid,JSON.stringify(fd));
            T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:fid,action:f.action||w.location.href,fields:fd,has_lead:hl}});
          }
        },true);
      },
      _h:function(s){var h=0;for(var i=0;i<(s||'').length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h).toString(36).substr(0,6);}
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
