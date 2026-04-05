export const onRequestGet = async () => {
  const script = `(function(w){
    var T={id:null,b:null,v:null,
      _ck:['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'],
      init:function(t,e){
        if(T.id)return;
        T.id=t;
        T.b=e.replace(/\\/$/, '');
        T.v=sessionStorage.getItem('nx_v');
        if(!T.v){T.v='v'+Date.now().toString(36);sessionStorage.setItem('nx_v',T.v);}
        T._pv();
        T._f();
        console.log('[NX] Ready v18',t);
      },
      track:function(n,d){
        d=d||{};
        if(d.fields&&Object.keys(d.fields).length>0){T._sendForm(n,w.location.href,d);}
        else if(d.email||d.nome||d.name||d.phone||d.cpf){T._sendForm(n,w.location.href,d);}
        else if(d.form_fields){var ff=T._clean(d.form_fields);T._sendForm(n,w.location.href,ff);}
        else{T._s('conversion',{en:n,d:d});}
      },
      _clean:function(obj){
        var out={};
        for(var k in obj){
          var clean=k;
          if(k.indexOf('form_fields[')===0&&k.indexOf(']')>-1){clean=k.substring(12,k.length-1);}
          out[clean]=obj[k];
        }
        return out;
      },
      _getFormName:function(f){
        // Try multiple sources for form name (Elementor, etc)
        return f.name||
               f.id||
               f.getAttribute('data-form-name')||
               f.getAttribute('data-form-id')||
               f.getAttribute('data-name')||
               (f.querySelector('.elementor-form-name')?f.querySelector('.elementor-form-name').textContent.trim():null)||
               (f.querySelector('h1,h2,h3,h4')?f.querySelector('h1,h2,h3,h4').textContent.trim():null)||
               ('form_'+T._h(f.action||w.location.pathname));
      },
      _sendForm:function(name,url,d){
        var fd=T._clean(d);
        var hl=false;
        for(var k in fd){var lk=k.toLowerCase();for(var j=0;j<T._ck.length;j++){if(lk.indexOf(T._ck[j])!==-1){hl=true;break;}}}
        T._s('form',{url:url,ref:document.referrer||null,form_data:{fid:name,action:url,fields:fd,has_lead:hl}});
      },
      _s:function(ty,d){
        if(!T.id)return;
        var p={tracking_id:T.id,event_type:ty,url:d.url||w.location.href,referrer:d.ref||document.referrer||null,visitor_id:T.v,ts:new Date().toISOString()};
        if(d.en)p.event_name=d.en;
        if(d.d)p.data=d.d;
        if(d.form_data)p.form_data=d.form_data;
        console.log('[NX] Sent:',ty,d.form_data?d.form_data.fid:'',d.form_data?JSON.stringify(d.form_data.fields):'');
        var blob=new Blob([JSON.stringify(p)],{type:'application/json'});
        if(navigator.sendBeacon){navigator.sendBeacon(T.b+'/api/tracking/events',blob);}
        else{fetch(T.b+'/api/tracking/events',{method:'POST',body:blob,mode:'no-cors',credentials:'omit'}).catch(function(){});}
      },
      _pv:function(){T._s('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _f:function(){
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          if(f._nx)return;
          f._nx=true;
          T._captureForm(f);
        },true);
        document.addEventListener('click',function(e){
          var btn=e.target.closest('button[type="submit"],input[type="submit"]');
          if(!btn)return;
          var form=btn.form||btn.closest('form');
          if(form){setTimeout(function(){if(!form._nx){form._nx=true;T._captureForm(form);}},100);}
        },true);
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
                  var fd={};
                  if(data.form_fields){fd=T._clean(data.form_fields);}
                  else{for(var k in data)fd[k]=data[k];}
                  // Try to get form name from data
                  var fid=data.form_name||data.form_id||data.formName||data.formId||'form_'+T._h(typeof url==='string'?url:'');
                  console.log('[NX] AJAX Form:',fid,JSON.stringify(fd));
                  T._sendForm(fid,w.location.href,fd);
                }
              }catch(e){}
            }
            return origFetch.apply(this,arguments);
          };
        }
        var obs=new MutationObserver(function(){
          document.querySelectorAll('form').forEach(function(f){
            if(!f._nx){f.addEventListener('submit',function(){if(!f._nx){f._nx=true;T._captureForm(f);}},true);}
          });
        });
        obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
      },
      _captureForm:function(f){
        var fd={},hl=false;
        var formName=T._getFormName(f);
        console.log('[NX] Form element:',f.name||'no-name','id:',f.id||'no-id','class:',(f.className||'').substring(0,50));
        for(var i=0;i<f.elements.length;i++){
          var el=f.elements[i];
          if(!el.name||el.type==='submit'||el.type==='button'||el.type==='hidden')continue;
          var val=(el.type==='checkbox'||el.type==='radio')?(el.checked?el.value:''):el.value;
          var key=el.name;
          if(key.indexOf('form_fields[')===0&&key.indexOf(']')>-1){key=key.substring(12,key.length-1);}
          if(val!==undefined&&val!==null){
            fd[key]=val;
            var lk=key.toLowerCase();
            for(var j=0;j<T._ck.length;j++){if(lk.indexOf(T._ck[j])!==-1){hl=true;break;}}
          }
        }
        if(Object.keys(fd).length>0){
          console.log('[NX] Form captured:',formName,JSON.stringify(fd));
          T._sendForm(formName,w.location.href,fd);
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
