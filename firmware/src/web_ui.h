// Varuna — embedded single-page web UI, stored in flash (PROGMEM).
//
// Served at "/" by the on-board HTTP server. It polls /api/status once a second
// and drives the control endpoints. No external assets, no internet needed — the
// whole dashboard ships inside the firmware so it works on an isolated LAN or the
// SoftAP config portal.

#pragma once

#include <Arduino.h>

static const char INDEX_HTML[] PROGMEM = R"HTML(<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Varuna Pump Controller</title>
<style>
  :root{
    --bg:#0d1117;--card:#161b22;--line:#30363d;--ink:#e6edf3;--mut:#8b949e;
    --grn:#3fb950;--ylw:#d29922;--blu:#58a6ff;--red:#f85149;--accent:#1f6feb;
  }
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    background:var(--bg);color:var(--ink)}
  header{padding:18px 20px;border-bottom:1px solid var(--line);display:flex;
    align-items:center;justify-content:space-between;gap:12px}
  header h1{font-size:18px;margin:0;font-weight:600}
  header .ver{color:var(--mut);font-size:12px}
  main{max-width:760px;margin:0 auto;padding:18px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;
    padding:16px 18px;margin-bottom:16px}
  .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .spread{justify-content:space-between}
  h2{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);
    margin:0 0 12px}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;
    font-weight:600;font-size:14px;border:1px solid var(--line)}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--mut)}
  .dot.on{box-shadow:0 0 8px currentColor}
  .grn{color:var(--grn)} .ylw{color:var(--ylw)} .blu{color:var(--blu)} .red{color:var(--red)}
  .state-idle{color:var(--mut)} .state-running{color:var(--grn)} .state-fault{color:var(--red)}
  button{font:inherit;font-weight:600;cursor:pointer;border-radius:9px;padding:11px 16px;
    border:1px solid var(--line);background:#21262d;color:var(--ink)}
  button:hover{border-color:var(--mut)}
  button.primary{background:var(--accent);border-color:var(--accent)}
  button.danger{background:transparent;border-color:var(--red);color:var(--red)}
  button:disabled{opacity:.4;cursor:not-allowed}
  .seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
  .seg button{border:0;border-radius:0;background:transparent;padding:9px 18px}
  .seg button.sel{background:var(--accent)}
  .sensors{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .sensor{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);
    border-radius:9px;background:#0d1117}
  .sensor small{color:var(--mut);display:block;font-size:11px}
  .sensor b{font-size:14px}
  label{display:block;font-size:12px;color:var(--mut);margin:10px 0 4px}
  input,select{width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--line);
    background:#0d1117;color:var(--ink);font:inherit}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .note{color:var(--mut);font-size:12px;margin-top:8px}
  details summary{cursor:pointer;color:var(--mut);font-size:13px}
  .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#21262d;
    border:1px solid var(--line);padding:10px 16px;border-radius:9px;opacity:0;transition:.2s;
    pointer-events:none}
  .toast.show{opacity:1}
</style>
</head>
<body>
<header>
  <h1>💧 Varuna Pump Controller</h1>
  <span class="ver" id="ver">—</span>
</header>
<main>

  <div class="card">
    <div class="row spread">
      <div class="row">
        <span class="dot" id="stateDot"></span>
        <span class="pill"><span id="stateText" class="state-idle">—</span></span>
      </div>
      <div class="row">
        <span class="dot" id="motorDot"></span>
        <span id="motorText" class="mut">Motor —</span>
      </div>
    </div>
    <div class="note" id="faultNote" style="display:none"></div>
    <div class="note" id="uptimeNote"></div>
  </div>

  <div class="card">
    <h2>Mode</h2>
    <div class="row spread">
      <div class="seg" id="modeSeg">
        <button data-mode="auto">Automatic</button>
        <button data-mode="manual">Semi-Auto</button>
      </div>
      <span class="note" id="modeHint"></span>
    </div>
  </div>

  <div class="card" id="manualCard">
    <h2>Manual control (semi-automatic)</h2>
    <div class="row">
      <button class="primary" id="btnStart">▶ Force Start</button>
      <button id="btnStop">■ Stop</button>
    </div>
    <p class="note">Force Start runs the pump immediately (safety checks still apply) and
      auto-stops when the tank is full, the sump runs dry, the overload trips, or the
      run timeout is reached.</p>
  </div>

  <div class="card">
    <h2>Sensors</h2>
    <div class="sensors">
      <div class="sensor"><span class="dot" id="d_fl1"></span><div><small>Tank LOW float</small><b id="t_fl1">—</b></div></div>
      <div class="sensor"><span class="dot" id="d_fl2"></span><div><small>Tank HIGH float</small><b id="t_fl2">—</b></div></div>
      <div class="sensor"><span class="dot" id="d_pr1"></span><div><small>Sump LOW probe</small><b id="t_pr1">—</b></div></div>
      <div class="sensor"><span class="dot" id="d_pr2"></span><div><small>Sump MID probe</small><b id="t_pr2">—</b></div></div>
      <div class="sensor"><span class="dot" id="d_pr3"></span><div><small>Sump HIGH probe</small><b id="t_pr3">—</b></div></div>
      <div class="sensor"><span class="dot" id="d_ol"></span><div><small>Overload relay</small><b id="t_ol">—</b></div></div>
    </div>
  </div>

  <div class="card">
    <h2>Faults</h2>
    <div class="row spread">
      <span class="note" id="faultDetail">No latched fault.</span>
      <button class="danger" id="btnReset">Reset Fault</button>
    </div>
  </div>

  <div class="card">
    <details id="cfgDetails">
      <summary>⚙️ Configuration</summary>
      <div style="margin-top:14px">
        <div class="grid2">
          <div><label>WiFi SSID</label><input id="c_ssid" autocomplete="off"></div>
          <div><label>WiFi Password</label><input id="c_pass" type="password" autocomplete="off"></div>
        </div>
        <div class="grid2">
          <div><label>Hostname</label><input id="c_host"></div>
          <div><label>Default mode</label>
            <select id="c_mode"><option value="0">Automatic</option><option value="1">Semi-Auto</option></select>
          </div>
        </div>
        <div class="grid2">
          <div><label>Max run (minutes)</label><input id="c_maxrun" type="number" min="1" max="240"></div>
          <div><label>Dry-run lockout (minutes)</label><input id="c_drylock" type="number" min="0" max="120"></div>
        </div>
        <details style="margin-top:12px"><summary>MQTT (optional)</summary>
          <div class="grid2">
            <div><label>Broker host</label><input id="c_mqtt"></div>
            <div><label>Port</label><input id="c_mqttport" type="number"></div>
          </div>
          <div class="grid2">
            <div><label>Username</label><input id="c_mqttuser" autocomplete="off"></div>
            <div><label>Password</label><input id="c_mqttpass" type="password" autocomplete="off"></div>
          </div>
          <div><label>Base topic</label><input id="c_mqtttopic"></div>
        </details>
        <div class="row" style="margin-top:16px">
          <button class="primary" id="btnSave">Save &amp; Apply</button>
          <span class="note">Saving WiFi or MQTT changes reboots the controller.</span>
        </div>
      </div>
    </details>
  </div>

</main>
<div class="toast" id="toast"></div>

<script>
const $=id=>document.getElementById(id);
let cfgLoaded=false;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);}
function setDot(id,on,cls){const d=$(id);d.className='dot'+(on?' on '+cls:'');}

async function refresh(){
  try{
    const s=await (await fetch('/api/status')).json();
    $('ver').textContent='v'+s.version+' · '+(s.ip||'AP');
    // system state
    const st=$('stateText');st.textContent=s.state.toUpperCase();
    st.className='state-'+s.state;
    setDot('stateDot', true, s.state==='running'?'grn':s.state==='fault'?'red':'blu');
    // motor
    setDot('motorDot', s.motor, 'ylw');
    $('motorText').textContent='Motor '+(s.motor?'RUNNING':'off');
    $('motorText').className=s.motor?'ylw':'mut';
    // uptime / runtime
    $('uptimeNote').textContent='Uptime '+fmt(s.uptime)+
      (s.motor?(' · running for '+fmt(s.runtime)):'')+
      ' · WiFi '+(s.wifi?'connected':'disconnected');
    // mode segmented control
    document.querySelectorAll('#modeSeg button').forEach(b=>
      b.classList.toggle('sel', b.dataset.mode===s.mode));
    $('manualCard').style.opacity = s.mode==='manual'?'1':'.5';
    $('modeHint').textContent = s.mode==='manual'
      ? 'Pump waits for Force Start, then runs to an exit condition.'
      : 'Pump follows tank + sump levels automatically.';
    // sensors
    sens('fl1',s.fl1,'Tank LOW','tank low (fill)','tank ok');
    sens('fl2',s.fl2,'Tank HIGH','tank FULL','filling');
    sens('pr1',s.pr1,'Sump LOW','water','dry');
    sens('pr2',s.pr2,'Sump MID','water','dry');
    sens('pr3',s.pr3,'Sump HIGH','water','dry');
    // overload: healthy when NOT tripped
    setDot('d_ol', s.overload, 'red');
    $('t_ol').textContent = s.overload?'TRIPPED':'healthy';
    $('t_ol').className = s.overload?'red':'grn';
    // fault
    const f=s.fault&&s.fault!=='none';
    $('faultNote').style.display=f?'block':'none';
    $('faultNote').className='note red';
    $('faultNote').textContent=f?('⚠ Fault latched: '+s.fault):'';
    $('faultDetail').textContent=f?('Latched: '+s.fault+'. Clear the cause, then reset.'):'No latched fault.';
    $('btnReset').disabled=!f;
    if(!cfgLoaded) loadCfg();
  }catch(e){ $('uptimeNote').textContent='Controller unreachable…'; }
}
function fmt(sec){sec=Math.floor(sec);const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),x=sec%60;
  return (h?h+'h ':'')+(h||m?m+'m ':'')+x+'s';}
function sens(k,on,name,onTxt,offTxt){
  setDot('d_'+k,on,'blu');$('t_'+k).textContent=on?onTxt:offTxt;
  $('t_'+k).className=on?'blu':'mut';}

async function cmd(c){await fetch('/api/cmd?c='+c);toast('Command: '+c);refresh();}
document.querySelectorAll('#modeSeg button').forEach(b=>
  b.onclick=()=>cmd(b.dataset.mode));
$('btnStart').onclick=()=>cmd('start');
$('btnStop').onclick=()=>cmd('stop');
$('btnReset').onclick=()=>cmd('reset');

async function loadCfg(){
  try{
    const c=await (await fetch('/api/config')).json();
    $('c_ssid').value=c.ssid||'';$('c_host').value=c.host||'';
    $('c_mode').value=c.mode;$('c_maxrun').value=Math.round(c.maxrun/60);
    $('c_drylock').value=Math.round(c.drylock/60);
    $('c_mqtt').value=c.mqtt||'';$('c_mqttport').value=c.mqttport;
    $('c_mqttuser').value=c.mqttuser||'';$('c_mqtttopic').value=c.mqtttopic||'';
    cfgLoaded=true;
  }catch(e){}
}
$('btnSave').onclick=async()=>{
  const body={ssid:$('c_ssid').value,pass:$('c_pass').value,host:$('c_host').value,
    mode:+$('c_mode').value,maxrun:(+$('c_maxrun').value)*60,drylock:(+$('c_drylock').value)*60,
    mqtt:$('c_mqtt').value,mqttport:+$('c_mqttport').value,
    mqttuser:$('c_mqttuser').value,mqttpass:$('c_mqttpass').value,mqtttopic:$('c_mqtttopic').value};
  const r=await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)});
  const j=await r.json();
  toast(j.reboot?'Saved — rebooting…':'Saved');
};

refresh();setInterval(refresh,1000);
</script>
</body>
</html>)HTML";
