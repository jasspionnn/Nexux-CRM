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
        T._xhr();
        T._interceptFetch();
        console.log('[NX] Tracker v9 ready:',tid);
      },
      track:function(name,data){
        data=data||{};
        if(data.fields&&Object.keys(data.fields).length>0){
          T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:data.fid||'manual_'+name,action:w.location.href,fields:data.fields,has_lead:data.has_lead||false}});
        }else{
          T._send('conversion',{en:name,d:data});
        }
      },
      _send:function(type,data){
        if(!T.id)return;
        var p={tracking_id:T.id,event_type:type,url:data.url||w.location.href,referrer:data.ref||document.referrer||null,visitor_id:T.vid,ts:new Date().toISOString()};
        if(data.en)p.event_name=data.en;
        if(data.d)p.data=data.d;
        if(data.form_data)p.form_data=data.form_data;
        console.log('[NX] Sending:',type,data.form_data?data.form_data.fid:'',JSON.stringify(data.form_data?data.form_data.fields:null));
        var b=new Blob([JSON.stringify(p)],{type:'application/json'});
        navigator.sendBeacon?navigator.sendBeacon(T.url+'/api/tracking/events',b):fetch(T.url+'/api/tracking/events',{method:'POST',body:b,mode:'no-cors',credentials:'omit'}).catch(function(){});
      },
      _pv:function(){T._send('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _forms:function(){
        var convKeys=['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'];
        function capture(f){
          if(f._nx)return;
          f._nx=true;
          var fd={},hasLead=false;
          var inputs=f.querySelectorAll('input,textarea,select');
          inputs.forEach(function(el){
            if(el.type==='submit'||el.type==='button'||el.type==='hidden'||el.type==='file')return;
            var name=el.name||el.id||el.placeholder||'field_'+T._hash(el.className||el.getAttribute('data-testid')||'');
            if(!name)return;
            var val=el.type==='checkbox'||el.type==='radio'?(el.checked?el.value:''):el.value;
            if(val||val===0||val===''){fd[name]=val;var lk=name.toLowerCase();for(var j=0;j<convKeys.length;j++){if(lk.indexOf(convKeys[j])!==-1){hasLead=true;break;}}}
          });
          if(Object.keys(fd).length===0)return;
          var fid=f.id||'form_'+T._hash(f.action||w.location.pathname);
          console.log('[NX] Form captured:',fid,JSON.stringify(fd));
          T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:fid,action:f.action||w.location.href,fields:fd,has_lead:hasLead}});
          if(hasLead)console.log('[NX] Lead detected!');
        }
        // Listen to all forms on page
        function scanForms(){
          document.querySelectorAll('form').forEach(function(f){
            if(!f._nx){
              f.addEventListener('submit',function(e){capture(f);},true);
            }
          });
        }
        scanForms();
        // Watch for new forms (SPA)
        var obs=new MutationObserver(function(){setTimeout(scanForms,100);});
        obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
        // Also capture on button clicks
        document.addEventListener('click',function(e){
          var btn=e.target.closest('button,input,[role="button"],a');
          if(!btn)return;
          var tag=btn.tagName.toLowerCase();
          var type=btn.type||btn.getAttribute('type')||'';
          var cls=(btn.className||'').toLowerCase();
          if(tag==='button'||(tag==='input'&&type==='submit')||cls.indexOf('submit')!==-1||cls.indexOf('btn')!==-1||cls.indexOf('button')!==-1){
            var form=btn.form||btn.closest('form');
            if(form)setTimeout(function(){capture(form);},50);
          }
        },true);
      },
      _xhr:function(){
        var proto=w.XMLHttpRequest;if(!proto)return;
        var origSend=proto.prototype.send;var origOpen=proto.prototype.open;
        proto.prototype.open=function(method,url){this._nxUrl=url;return origOpen.apply(this,arguments);};
        proto.prototype.send=function(body){
          var xhr=this;
          xhr.addEventListener('load',function(){
            if(body&&typeof body==='string'&&body.indexOf('{')===0){
              try{
                var data=JSON.parse(body);
                if(data&&(data.email||data.nome||data.name||data.phone||data.telefone||data.cpf)){
                  var fd={},hasLead=false;
                  var ck=['email','phone','tel','whatsapp','nome','name','cpf','celular'];
                  for(var k in data){fd[k]=data[k];var lk=k.toLowerCase();for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hasLead=true;break;}}}
                  if(Object.keys(fd).length>0){
                    T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:'xhr_'+T._hash(xhr._nxUrl||''),action:xhr._nxUrl||'',fields:fd,has_lead:hasLead}});
                  }
                }
              }catch(e){}
            }
          });
          return origSend.apply(this,arguments);
        };
      },
      _interceptFetch:function(){
        var orig=w.fetch;if(!orig)return;
        w.fetch=function(){
          var url=arguments[0];var opts=arguments[1]||{};
          var body=opts.body;
          if(body&&typeof body==='string'&&body.indexOf('{')===0){
            try{
              var data=JSON.parse(body);
              if(data&&(data.email||data.nome||data.name||data.phone||data.telefone||data.cpf)){
                var fd={},hasLead=false;
                var ck=['email','phone','tel','whatsapp','nome','name','cpf','celular'];
                for(var k in data){fd[k]=data[k];var lk=k.toLowerCase();for(var j=0;j<ck.length;j++){if(lk.indexOf(ck[j])!==-1){hasLead=true;break;}}}
                if(Object.keys(fd).length>0){
                  T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:'fetch_'+T._hash(typeof url==='string'?url:JSON.stringify(url)),action:typeof url==='string'?url:'',fields:fd,has_lead:hasLead}});
                }
              }
            }catch(e){}
          }
          return orig.apply(this,arguments);
        };
      },
      _hash:function(s){var h=0;for(var i=0;i<(s||'').length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h).toString(36).substr(0,6);}
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
