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
        T._ajax();
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
        if(type==='conversion')console.log('[NX] Conversion:',data.en||'unknown');
        if(type==='form')console.log('[NX] Form:',data.form_data?data.form_data.fid:'unknown','fields:',data.form_data?Object.keys(data.form_data.fields||{}).join(', '):'none');
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
        // Also capture forms submitted via button click
        document.addEventListener('click',function(e){
          var btn=e.target.closest('button[type="submit"],input[type="submit"],[type="submit"]');
          if(!btn)return;
          var f=btn.closest('form')||btn.form;
          if(f)T._captureForm(f,convKeys);
        },true);
      },
      _captureForm:function(f,convKeys){
        if(f._nxTracked)return;
        f._nxTracked=true;
        var fd={},hasConv=false,convFields={};
        for(var i=0;i<f.elements.length;i++){
          var el=f.elements[i];
          if(el.name&&el.type!=='submit'&&el.type!=='button'&&el.type!=='hidden'){
            var val=el.type==='checkbox'||el.type==='radio'?(el.checked?el.value:''):el.value;
            if(val)fd[el.name]=val;
            var lk=(el.name+' '+(el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();
            for(var j=0;j<convKeys.length;j++){
              if(lk.indexOf(convKeys[j])!==-1){hasConv=true;convFields[el.name]=val;break;}
            }
          }
        }
        var action=f.action||f.getAttribute('action')||'no-action';
        T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:f.id||'unknown',action:action,fields:fd}});
        if(hasConv){
          T._send('conversion',{en:'form_lead',d:{form:f.id||'unknown',fields:convFields}});
          console.log('[NX] Lead captured:',JSON.stringify(convFields));
        }
      },
      _ajax:function(){
        var origOpen=w.XMLHttpRequest&&w.XMLHttpRequest.prototype.open;
        if(origOpen){
          w.XMLHttpRequest.prototype.open=function(method,url){
            this._nxUrl=url;
            return origOpen.apply(this,arguments);
          };
        }
        var origSend=w.XMLHttpRequest&&w.XMLHttpRequest.prototype.send;
        if(origSend){
          w.XMLHttpRequest.prototype.send=function(body){
            var xhr=this;
            xhr.addEventListener('load',function(){
              if(xhr._nxUrl&&xhr._nxUrl.indexOf('form')!==-1&&body){
                try{
                  var data=typeof body==='string'?JSON.parse(body):body;
                  if(data&&typeof data==='object'){
                    var fd={},hasConv=false,convFields={};
                    var convKeys=['email','phone','tel','whatsapp','nome','name','cpf','celular'];
                    for(var k in data){
                      fd[k]=data[k];
                      var lk=k.toLowerCase();
                      for(var j=0;j<convKeys.length;j++){
                        if(lk.indexOf(convKeys[j])!==-1){hasConv=true;convFields[k]=data[k];break;}
                      }
                    }
                    if(Object.keys(fd).length>0){
                      T._send('form',{url:w.location.href,ref:document.referrer||null,form_data:{fid:'ajax_form',action:xhr._nxUrl,fields:fd}});
                      if(hasConv){T._send('conversion',{en:'form_lead',d:{form:'ajax_form',fields:convFields}});}
                    }
                  }
                }catch(e){}
              }
            });
            return origSend.apply(this,arguments);
          };
        }
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
