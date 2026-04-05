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
        console.log('[NX] Ready v20',t);
      },
      track:function(n,d){
        d=d||{};
        if(d.form_fields){
          var ff={};for(var k in d.form_fields){var c=k.replace('form_fields[','').replace(']','');ff[c]=d.form_fields[k];}
          T._sf(n,w.location.href,ff);
        }else if(d.email||d.nome||d.name||d.phone){
          T._sf(n,w.location.href,d);
        }else{
          T._s('conversion',{en:n,d:d});
        }
      },
      _clean:function(obj){
        var out={};
        for(var k in obj){var c=k.replace('form_fields[','').replace(']','');out[c]=obj[k];}
        return out;
      },
      _sf:function(name,url,fields){
        var hl=false,ck=['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'];
        for(var k in fields){var lk=k.toLowerCase();for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}}
        T._s('form',{url:url,ref:document.referrer||null,form_data:{fid:name,action:url,fields:fields,has_lead:hl}});
      },
      _s:function(ty,d){
        if(!T.id)return;
        var p={tracking_id:T.id,event_type:ty,url:d.url||w.location.href,referrer:d.ref||document.referrer||null,visitor_id:T.v,ts:new Date().toISOString()};
        if(d.en)p.event_name=d.en;
        if(d.d)p.data=d.d;
        if(d.form_data)p.form_data=d.form_data;
        console.log('[NX]',ty,d.form_data?d.form_data.fid:'',d.form_data?JSON.stringify(d.form_data.fields):'');
        fetch(T.b+'/api/tracking/events',{method:'POST',body:JSON.stringify(p),mode:'no-cors'}).catch(function(){});
      },
      _pv:function(){T._s('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _getFName:function(f){
        // Try ALL possible sources for Elementor form name
        return f.name||
               f.getAttribute('data-form-name')||
               f.getAttribute('data-name')||
               (f.dataset&&f.dataset.formName)||
               (function(){try{var s=JSON.parse(f.getAttribute('data-settings')||'{}');return s.form_name||s.name||'';}catch(e){return '';}})()||
               (f.querySelector('.elementor-form-name')?f.querySelector('.elementor-form-name').textContent.trim():'')||
               (f.querySelector('input[name="form_name"]')?f.querySelector('input[name="form_name"]').value:'')||
               (f.querySelector('input[name="form_id"]')?f.querySelector('input[name="form_id"]').value:'')||
               f.id||
               ('form_'+T._h(f.action||w.location.pathname));
      },
      _f:function(){
        var ck=['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'];
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          if(f._nx)return;
          f._nx=true;
          var fd={},hl=false;
          var fname=T._getFName(f);
          console.log('[NX] Form debug: name='+f.name+' id='+f.id+' data-form-name='+(f.getAttribute('data-form-name')||'none')+' class='+(f.className||'').substring(0,40));
          for(var i=0;i<f.elements.length;i++){
            var el=f.elements[i];
            if(!el.name||el.type==='submit'||el.type==='button'||el.type==='hidden')continue;
            var val=el.type==='checkbox'||el.type==='radio'?(el.checked?el.value:''):el.value;
            var key=el.name;
            if(key.indexOf('form_fields[')===0&&key.indexOf(']')>-1){key=key.substring(12,key.length-1);}
            if(val!==undefined&&val!==null){
              fd[key]=val;
              var lk=key.toLowerCase();
              for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}
            }
          }
          if(Object.keys(fd).length>0){
            console.log('[NX] Form captured:',fname,JSON.stringify(fd));
            T._sf(fname,w.location.href,fd);
          }
        },true);
        document.addEventListener('click',function(e){
          var btn=e.target.closest('button[type="submit"],input[type="submit"]');
          if(!btn)return;
          var form=btn.form||btn.closest('form');
          if(form&&!form._nx){setTimeout(function(){form._nx=true;T._captureForm(form,ck);},100);}
        },true);
        var origFetch=w.fetch;
        if(origFetch){
          w.fetch=function(){
            var url=arguments[0];var opts=arguments[1]||{};var body=opts.body;
            if(body&&typeof body==='string'&&body.charAt(0)==='{'){
              try{
                var data=JSON.parse(body);
                if(data&&(data.email||data.nome||data.name||data.phone||data.form_fields)){
                  var fd={},fname=data.form_name||data.form_id||'quizflow_form';
                  if(data.form_fields){for(var k in data.form_fields){var c=k.replace('form_fields[','').replace(']','');fd[c]=data.form_fields[k];}}
                  else{for(var k in data)fd[k]=data[k];}
                  if(Object.keys(fd).length>0){
                    console.log('[NX] AJAX:',fname,JSON.stringify(fd));
                    T._sf(fname,w.location.href,fd);
                  }
                }
              }catch(e){}
            }
            return origFetch.apply(this,arguments);
          };
        }
      },
      _captureForm:function(f,ck){
        var fd={},hl=false;
        var fname=T._getFName(f);
        for(var i=0;i<f.elements.length;i++){
          var el=f.elements[i];
          if(!el.name||el.type==='submit'||el.type==='button'||el.type==='hidden')continue;
          var val=el.type==='checkbox'||el.type==='radio'?(el.checked?el.value:''):el.value;
          var key=el.name;
          if(key.indexOf('form_fields[')===0&&key.indexOf(']')>-1){key=key.substring(12,key.length-1);}
          if(val!==undefined&&val!==null){fd[key]=val;var lk=key.toLowerCase();for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hl=true;break;}}}
        }
        if(Object.keys(fd).length>0){console.log('[NX] Click form:',fname,JSON.stringify(fd));T._sf(fname,w.location.href,fd);}
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
