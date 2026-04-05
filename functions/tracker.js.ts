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
        T._fetch();
        console.log('[NX] Tracker v8 initialized:',tid);
      },
      track:function(name,data){
        data=data||{};
        // If data has fields, treat as form submission
        if(data.fields&&Object.keys(data.fields).length>0){
          T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:data.fid||'manual_'+name,action:w.location.href,fields:data.fields,has_lead:data.has_lead||false}});
        }else{
          T._send('conversion',{en:name,d:data});
        }
      },
      _send:function(type,data){
        if(!T.id){return;}
        var p={tracking_id:T.id,event_type:type,url:data.url||w.location.href,referrer:data.ref||document.referrer||null,visitor_id:T.vid,ts:new Date().toISOString()};
        if(data.en)p.event_name=data.en;
        if(data.d)p.data=data.d;
        if(data.form_data)p.form_data=data.form_data;
        console.log('[NX] Sending:',type,data.form_data?data.form_data.fid:'');
        fetch(T.url+'/api/tracking/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),mode:'no-cors',credentials:'omit'}).catch(function(){});
      },
      _pv:function(){T._send('pageview',{url:w.location.href,ref:document.referrer||null,title:document.title});},
      _forms:function(){
        var convKeys=['email','phone','tel','whatsapp','nome','name','cpf','celular','telefone','mail'];
        document.addEventListener('submit',function(e){
          var f=e.target;
          if(!f||f.tagName!=='FORM')return;
          T._captureForm(f,convKeys);
        },true);
        document.addEventListener('click',function(e){
          var btn=e.target.closest('button[type="submit"],input[type="submit"]');
          if(!btn)return;
          var form=btn.form||btn.closest('form');
          if(form&&!form._nx)T._captureForm(form,convKeys);
        },true);
      },
      _captureForm:function(f,convKeys){
        if(f._nx)return;
        f._nx=true;
        var fd={},hasConv=false;
        var inputs=f.querySelectorAll('input,textarea,select');
        inputs.forEach(function(el){
          if(!el.name||el.type==='submit'||el.type==='button'||el.type==='hidden'||el.type==='file')return;
          var val=el.value;
          if(el.type==='checkbox'&&!el.checked)return;
          if(!val&&val!=='0')return;
          fd[el.name]=val;
          var lk=(el.name+' '+(el.placeholder||'')).toLowerCase();
          for(var j=0;j<convKeys.length;j++){if(lk.indexOf(convKeys[j])!==-1){hasConv=true;break;}}
        });
        if(Object.keys(fd).length===0)return;
        var fid=f.id||'form_'+T._hash(f.action||w.location.pathname);
        console.log('[NX] Form captured:',fid,'fields:',Object.keys(fd).join(', '));
        T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:fid,action:f.action||w.location.href,fields:fd,has_lead:hasConv}});
        if(hasConv)console.log('[NX] Lead captured!');
      },
      _fetch:function(){
        var orig=w.fetch;
        if(!orig)return;
        w.fetch=function(){
          var url=arguments[0];
          var opts=arguments[1]||{};
          var body=opts.body;
          if(body&&typeof body==='string'){
            try{
              var data=JSON.parse(body);
              if(data&&(data.email||data.nome||data.name||data.phone||data.telefone)){
                var fd={},hasLead=false;
                var convKeys=['email','phone','tel','whatsapp','nome','name','cpf','celular'];
                for(var k in data){
                  fd[k]=data[k];
                  var lk=k.toLowerCase();
                  for(var j=0;j<convKeys.length;j++){if(lk.indexOf(convKeys[j])!==-1){hasLead=true;break;}}
                }
                if(Object.keys(fd).length>0){
                  T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:'fetch_'+T._hash(typeof url==='string'?url:JSON.stringify(url)),action:typeof url==='string'?url:'',fields:fd,has_lead:hasLead}});
                }
              }
            }catch(e){}
          }
          return orig.apply(this,arguments);
        };
      },
      _hash:function(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return Math.abs(h).toString(36).substr(0,6);}
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
