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
        console.log('[NX] Ready v16',t);
      },
      track:function(n,d){
        d=d||{};
        if(d.fields&&Object.keys(d.fields).length>0){
          T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:d.fid||n,action:w.location.href,fields:d.fields,has_lead:d.has_lead||false}});
        }else if(d.email||d.nome||d.name||d.phone||d.cpf||d.form_fields){
          if(d.form_fields){
            var ff={};for(var k in d.form_fields){var clean=k.replace(/^form_fields\\[/,'').replace(/\\]$/,'');ff[clean]=d.form_fields[k];}
            T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:n,action:w.location.href,fields:ff,has_lead:true}});
          }else{
            T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:n,action:w.location.href,fields:d,has_lead:true}});
          }
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
        fetch(T.b+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),mode:'no-cors',credentials:'omit'}).catch(function(e){console.warn('[NX] Failed:',e);});
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
          var formName=f.name||f.id||('form_'+T._h(f.action||w.location.pathname));
          for(var i=0;i<f.elements.length;i++){
            var el=f.elements[i];
            if(!el.name||el.type==='submit'||el.type==='button'||el.type==='hidden')continue;
            var val=(el.type==='checkbox'||el.type==='radio')?(el.checked?el.value:''):el.value;
            // Strip form_fields[name] -> name
            var key=el.name;
            if(key.indexOf('form_fields[')===0&&key.indexOf(']')>-1){
              key=key.substring(12,key.length-1);
            }
            if(val!==undefined&&val!==null){
              fd[key]=val;
              var lk=key.toLowerCase();
              for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}
            }
          }
          if(Object.keys(fd).length>0){
            console.log('[NX] Form captured:',formName,JSON.stringify(fd));
            T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:formName,action:f.action||w.location.href,fields:fd,has_lead:hl}});
          }
        },true);
        // Intercept fetch for AJAX forms (quizflow)
        var origFetch=w.fetch;
        if(origFetch){
          w.fetch=function(){
            var url=arguments[0];
            var opts=arguments[1]||{};
            var body=opts.body;
            if(body&&typeof body==='string'){
              try{
                var data=JSON.parse(body);
                if(data&&(data.email||data.nome||data.name||data.phone||data.telefone||data.cpf||data.form_fields)){
                  var fd={},hl=false;
                  if(data.form_fields&&typeof data.form_fields==='object'){
                    for(var k in data.form_fields){
                      var clean=k.indexOf('form_fields[')===0?k.substring(12,k.length-1):k;
                      fd[clean]=data.form_fields[k];
                      var lk=clean.toLowerCase();
                      for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}
                    }
                  }else{
                    for(var k in data){fd[k]=data[k];var lk=k.toLowerCase();for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}}
                  }
                  if(Object.keys(fd).length>0){
                    var formName=data.form_name||data.form_id||'quizflow_form';
                    console.log('[NX] AJAX Form:',formName,JSON.stringify(fd));
                    T._s('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:formName,action:typeof url==='string'?url:'',fields:fd,has_lead:hl}});
                  }
                }
              }catch(e){}
            }
            return origFetch.apply(this,arguments);
          };
        }
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
