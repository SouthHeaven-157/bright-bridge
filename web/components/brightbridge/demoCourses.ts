import type { Course } from './course'
import { parseCourseHtml } from './course'

/* ---------- 内联 SVG 图标（和主界面同一套画法） ---------- */
const P: Record<string, string[]> = {
  gear: ['M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z', 'M19.4 13a7.6 7.6 0 000-2l2-1.5-2-3.4-2.3 1a7.7 7.7 0 00-1.7-1L15 3.5h-4l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.3-1-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.5 2 3.4 2.3-1c.5.4 1.1.8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.3 1 2-3.4z'],
  wifi: ['M4 9.5a13 13 0 0116 0', 'M7.5 13.2a8 8 0 019 0', 'M11 16.8a3 3 0 012 0', 'M12 20h.01'],
  signal: ['M4 20v-4', 'M9.3 20V10', 'M14.7 20V6', 'M20 20V3'],
  battery: ['M2 8h16a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V9a1 1 0 011-1z', 'M22 11v2', 'M4 11v2h5v-2z'],
  phone: ['M21 16.9v2.6a2 2 0 01-2.2 2 18.5 18.5 0 01-8-2.8 18 18 0 01-5.6-5.6 18.5 18.5 0 01-2.8-8A2 2 0 014.4 3h2.6a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.4 2L8 10.5a15 15 0 005.5 5.5l1.2-1.2a2 2 0 012-.4c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z'],
  message: ['M21 12a8 8 0 01-.9 3.6 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.6-.9L3 21l1.6-6a8.4 8.4 0 01-.9-3.6 8.5 8.5 0 014.7-7.6A8 8 0 0112 3h.5a8.5 8.5 0 018 8.5z'],
  camera: ['M21 19.5H3a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 013 7.5h3.5L8.5 4.5h7L17.5 7.5H21A1.5 1.5 0 0122.5 9v9a1.5 1.5 0 01-1.5 1.5z', 'M12 17a4 4 0 100-8 4 4 0 000 8z'],
  clock: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 7.5V12l3 2'],
  photo: ['M4.5 3.5h15v15h-15z', 'M8.5 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', 'M19.5 15l-5-5-9.5 9.5'],
  user: ['M12 12a4 4 0 100-8 4 4 0 000 8z', 'M4.5 21c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6'],
  volume: ['M11 5L6.5 9H3v6h3.5L11 19z', 'M15.5 8.5a5 5 0 010 7', 'M18.5 6a9 9 0 010 12'],
  display: ['M12 16a4 4 0 100-8 4 4 0 000 8z', 'M12 2v2.5', 'M12 19.5V22', 'M2 12h2.5', 'M19.5 12H22', 'M5 5l1.8 1.8', 'M17.2 17.2L19 19', 'M19 5l-1.8 1.8', 'M6.8 17.2L5 19'],
  font: ['M4 20L10 4l6 16', 'M6.2 14.5h7.6', 'M17 20l2.5-6.5L22 20'],
  star: ['M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 3 1.1-6.2L3 9.7l6.2-.9z'],
  lock: ['M4 11.5h16v9H4z', 'M8 11.5V8a4 4 0 118 0v3.5'],
  apps: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
}
const ic = (name: string, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[name].map(d => `<path d="${d}"/>`).join('')}</svg>`

/* ---------- 手机（HyperOS 风格） ---------- */
const PHONE_CSS = `*{box-sizing:border-box;margin:0}
.phone{width:100%;height:100%;border:10px solid #16242f;border-radius:36px;background:#f2f5f7;display:flex;flex-direction:column;overflow:hidden}
.pstat{display:flex;justify-content:space-between;align-items:center;padding:8px 22px 2px;font-size:12px;font-weight:600;color:#1d2b36}
.pgrid{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:14px 4px;padding:16px 10px;align-content:start;justify-items:center}
.app{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;padding:0;font:inherit;color:#1d2b36;cursor:pointer}
.app .ic{width:54px;height:54px;border-radius:15px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 8px rgba(20,40,60,.18)}
.app small{font-size:13px}
.ptitle{padding:12px 18px 6px;font-size:19px;font-weight:700;text-align:left}
.plist{flex:1;display:flex;flex-direction:column;gap:8px;padding:4px 12px 16px}
.psearch{background:#e8eef1;border-radius:999px;color:#7b8b95;padding:10px 14px;font-size:14px}
.prow{display:flex;align-items:center;gap:12px;background:#fff;border:0;border-radius:14px;padding:13px 14px;font:inherit;color:#1d2b36;text-align:left;width:100%;cursor:pointer}
.prow .ri{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;flex:none}
.prow .rl{flex:1;font-size:16px}
.prow .chev{color:#b3c2ca;font-size:20px;line-height:1}
.tgl{width:46px;height:26px;border-radius:999px;background:#ccd8de;position:relative;flex:none}
.tgl i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.tgl.on{background:#35b26b}.tgl.on i{left:23px}
.trk{width:96px;height:26px;border-radius:999px;background:#dde6ea;position:relative;flex:none}
.trk i{position:absolute;left:0;top:0;height:100%;border-radius:999px;background:#7cc7e8}
.trk b{position:absolute;top:2px;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3)}`

const stat = `<div class="pstat"><span>9:41</span><span style="display:flex;gap:6px;align-items:center">${ic('signal', 14)}${ic('battery', 16)}</span></div>`

const APPS = [
  { id: 'icon-settings', label: '设置', icon: 'gear', bg: '#3d8fdd' },
  { id: 'icon-phone', label: '电话', icon: 'phone', bg: '#2faa6b' },
  { id: 'icon-message', label: '信息', icon: 'message', bg: '#21a5a2' },
  { id: 'icon-camera', label: '相机', icon: 'camera', bg: '#8a6fd6' },
  { id: 'icon-clock', label: '时钟', icon: 'clock', bg: '#e8913c' },
  { id: 'icon-photo', label: '相册', icon: 'photo', bg: '#dcb23a' },
  { id: 'icon-contacts', label: '联系人', icon: 'user', bg: '#8fa0aa' },
  { id: 'icon-recorder', label: '录音机', icon: 'volume', bg: '#e2604f' },
]
const home = `<div class="phone">${stat}<div class="pgrid">${APPS.map(a =>
  `<button class="app" id="${a.id}"><span class="ic" style="background:${a.bg}">${ic(a.icon, 26)}</span><small>${a.label}</small></button>`).join('')}</div></div>`

const row = (id: string, label: string, icon: string, bg: string, right = '<span class="chev">›</span>') =>
  `<button class="prow" id="${id}"><span class="ri" style="background:${bg}">${ic(icon, 18)}</span><span class="rl">${label}</span>${right}</button>`

const settingsPage = `<div class="phone">${stat}<div class="ptitle">设置</div><div class="plist"><div class="psearch">搜索设置项</div>
${row('row-wlan', '无线和网络', 'wifi', '#3d8fdd')}
${row('row-display', '显示与亮度', 'display', '#e8913c')}
${row('row-sound', '声音和振动', 'volume', '#8a6fd6')}
${row('row-apps', '应用设置', 'apps', '#21a5a2')}
${row('row-battery', '电池与省电', 'battery', '#2faa6b')}</div></div>`

const wlanPage = (on: boolean) => `<div class="phone">${stat}<div class="ptitle">无线和网络</div><div class="plist">
<button class="prow" id="sw-wifi"><span class="ri" style="background:#3d8fdd">${ic('wifi', 18)}</span><span class="rl">无线网络</span><span class="tgl${on ? ' on' : ''}"><i></i></span></button>
${row('net-home', '家里的网', on ? 'wifi' : 'lock', on ? '#2faa6b' : '#8fa0aa')}
${row('net-next', '邻居家的网', 'lock', '#8fa0aa')}</div></div>`

const displayPage = `<div class="phone">${stat}<div class="ptitle">显示与亮度</div><div class="plist">
${row('row-font', '字体大小', 'font', '#3d8fdd')}
${row('row-bright', '屏幕亮度', 'display', '#e8913c')}
${row('row-dark', '护眼模式', 'star', '#8a6fd6')}</div></div>`

const fontPage = `<div class="phone">${stat}<div class="ptitle">字体大小</div><div class="plist">
<button class="prow" id="slider-size"><span class="ri" style="background:#3d8fdd">${ic('font', 18)}</span><span class="rl">字体大小</span><span class="trk"><i style="width:30%"></i><b style="left:30%"></b></span></button></div></div>`

/* ---------- ATM 取款机 ---------- */
const ATM_CSS = `*{box-sizing:border-box;margin:0}
.atm{width:100%;height:100%;background:linear-gradient(#414d58,#2c363e);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px}
.ascreen{flex:1;background:#f3f7fa;border:3px solid #5a6772;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.ahead{background:#1c5f8a;color:#fff;padding:10px 14px;font-size:15px;font-weight:700;text-align:left}
.abody{flex:1;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.alabel{font-size:17px;font-weight:700;color:#334754;text-align:left;width:100%}
.abig{background:#2d7fb8;color:#fff;border:0;border-radius:10px;padding:14px 44px;font-size:22px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.25)}
.adots{font-size:32px;letter-spacing:12px;color:#1d2b36}
.amid{display:flex;gap:10px;height:206px}
.apad{flex:1;background:#39434c;border-radius:12px;padding:10px;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:8px}
.akey{background:#e8edf1;border:0;border-radius:8px;font-size:20px;font-weight:700;color:#1d2b36;font-family:inherit;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.35)}
.akey.ok{background:#35b26b;color:#fff}
.aside{width:34%;background:#39434c;border-radius:12px;display:flex;flex-direction:column;gap:8px;padding:10px}
.aside .t{color:#9fb3bd;font-size:13px;text-align:center}
.acard{flex:1;border-radius:8px;border:2px dashed #6a7680;color:#9fb3bd;font-size:13px;display:flex;align-items:center;justify-content:center}
.acash{height:56px;background:#39434c;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9fb3bd;font-size:14px;gap:8px}`

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清除', '0', '确认']
const pad = KEYS.map(k =>
  `<button class="akey${k === '确认' ? ' ok' : ''}" id="${k === '确认' ? 'key-ok' : `key-${k}`}">${k}</button>`).join('')

const atmDoc = `<!doctype html><html><head><title>在ATM取钱</title></head><body>
<section class="sb-step" data-guide="看屏幕中间，蓝色的长条按钮，写着取款两个字，点一下。" data-why="取钱先按取款" data-action="tap" data-target="btn-quick" data-direction="right"><style>${ATM_CSS}</style>
<div class="atm"><div class="ascreen"><div class="ahead">欢迎光临</div><div class="abody"><div class="alabel">请选择服务</div><button class="abig" id="btn-quick">取款</button></div></div>
<div class="amid"><div class="apad">${pad}</div><div class="aside"><div class="t">插卡口</div><div class="acard">银行卡从这里插入</div></div></div>
<div class="acash">出钞口</div></div></section>
<section class="sb-step" data-guide="找键盘第1排第1个，白色的方形按键，写着数字1，点一下。" data-why="密码要一位一位按" data-action="tap" data-target="key-1" data-direction="right"><style>${ATM_CSS}</style>
<div class="atm"><div class="ascreen"><div class="ahead">安全验证</div><div class="abody"><div class="alabel">请输入密码</div><div class="adots">●</div></div></div>
<div class="amid"><div class="apad">${pad}</div><div class="aside"><div class="t">插卡口</div><div class="acard">银行卡从这里插入</div></div></div>
<div class="acash">出钞口</div></div></section>
<section class="sb-step" data-guide="找键盘第1排第2个，白色的方形按键，写着数字2，点一下。" data-why="再按第二位" data-action="tap" data-target="key-2" data-direction="right"><style>${ATM_CSS}</style>
<div class="atm"><div class="ascreen"><div class="ahead">安全验证</div><div class="abody"><div class="alabel">请输入密码</div><div class="adots">●●</div></div></div>
<div class="amid"><div class="apad">${pad}</div><div class="aside"><div class="t">插卡口</div><div class="acard">银行卡从这里插入</div></div></div>
<div class="acash">出钞口</div></div></section>
<section class="sb-step" data-guide="找键盘第1排第3个，白色的方形按键，写着数字3，点一下。" data-why="再按第三位" data-action="tap" data-target="key-3" data-direction="right"><style>${ATM_CSS}</style>
<div class="atm"><div class="ascreen"><div class="ahead">安全验证</div><div class="abody"><div class="alabel">请输入密码</div><div class="adots">●●●</div></div></div>
<div class="amid"><div class="apad">${pad}</div><div class="aside"><div class="t">插卡口</div><div class="acard">银行卡从这里插入</div></div></div>
<div class="acash">出钞口</div></div></section>
<section class="sb-step" data-guide="找键盘最下面一排，绿色的按键，写着确认两个字，点一下。" data-why="按确认钱才会出来" data-action="tap" data-target="key-ok" data-direction="right"><style>${ATM_CSS}</style>
<div class="atm"><div class="ascreen"><div class="ahead">请确认</div><div class="abody"><div class="alabel">取出金额</div><div class="adots" style="letter-spacing:0">100 元</div></div></div>
<div class="amid"><div class="apad">${pad}</div><div class="aside"><div class="t">插卡口</div><div class="acard">银行卡从这里插入</div></div></div>
<div class="acash">出钞口</div></div></section>
</body></html>`

/* ---------- 地铁售票机 ---------- */
const METRO_CSS = `*{box-sizing:border-box;margin:0}
.mtr{width:100%;height:100%;background:#123a5c;border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px}
.mscreen{flex:1;background:#eef4f8;border-radius:10px;border:3px solid #2c5d84;display:flex;flex-direction:column;overflow:hidden}
.mhead{background:#0d2c46;color:#fff;padding:10px 14px;font-size:15px;font-weight:700;text-align:left}
.mbody{flex:1;padding:12px;display:flex;flex-direction:column;gap:10px}
.mlabel{font-size:17px;font-weight:700;color:#1d2b36;text-align:left}
.mbtn{background:#fff;border:2px solid #cdd9e0;border-radius:10px;padding:12px;font-size:18px;font-weight:700;color:#1d2b36;font-family:inherit;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
.mbtn small{color:#7b8b95;font-weight:600}
.mbtn.sel{background:#2d7fb8;color:#fff;border-color:#2d7fb8}
.mbtn.sel small{color:#d8ecf8}
.mfoot{display:flex;gap:10px;align-items:stretch}
.mpay{flex:1;background:#35b26b;color:#fff;border:0;border-radius:10px;padding:14px;font-size:20px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.25)}
.mslot{width:42%;border-radius:10px;border:3px solid #2c5d84;display:flex;align-items:center;justify-content:center;color:#0d2c46;font-weight:700;font-size:15px;background:#d9e8f2}
.mslot.glow{background:#ffe9b8;border-color:#e8a13c;animation:blink 1s infinite}
@keyframes blink{50%{background:#fff3d9}}`

const metroDoc = `<!doctype html><html><head><title>买地铁票</title></head><body>
<section class="sb-step" data-guide="看屏幕中间，写着火车站的长条按钮，点一下。" data-why="先选要去的地方" data-action="tap" data-target="dest-station" data-direction="right"><style>${METRO_CSS}</style>
<div class="mtr"><div class="mscreen"><div class="mhead">自动售票机</div><div class="mbody"><div class="mlabel">请选择目的地</div>
<button class="mbtn" id="dest-square">人民广场<small>3元</small></button>
<button class="mbtn sel" id="dest-station">火车站<small>4元</small></button>
<button class="mbtn" id="dest-airport">机场<small>7元</small></button></div></div></div></section>
<section class="sb-step" data-guide="看屏幕中间，写着1张的长条按钮，点一下。" data-why="只买一张票" data-action="tap" data-target="qty-1" data-direction="right"><style>${METRO_CSS}</style>
<div class="mtr"><div class="mscreen"><div class="mhead">自动售票机</div><div class="mbody"><div class="mlabel">目的地：火车站，请选择张数</div>
<button class="mbtn sel" id="qty-1">1张<small>4元</small></button>
<button class="mbtn" id="qty-2">2张<small>8元</small></button></div></div></div></section>
<section class="sb-step" data-guide="找下面绿色的大按钮，写着确认购票，点一下。" data-why="按了它票才会出来" data-action="tap" data-target="btn-pay" data-direction="right"><style>${METRO_CSS}</style>
<div class="mtr"><div class="mscreen"><div class="mhead">自动售票机</div><div class="mbody"><div class="mlabel">应付 4 元，请确认</div></div>
<div class="mfoot" style="padding:12px"><button class="mpay" id="btn-pay">确认购票</button><div class="mslot">取票口</div></div></div></div></section>
<section class="sb-step" data-guide="看下面发光的口子，写着取票口，点一下。" data-why="把票拿出来" data-action="tap" data-target="slot-take" data-direction="right"><style>${METRO_CSS}</style>
<div class="mtr"><div class="mscreen"><div class="mhead">自动售票机</div><div class="mbody"><div class="mlabel">购票成功，请取走车票</div></div>
<div class="mfoot" style="padding:12px"><div class="mpay" style="background:#b9cdd4;cursor:default">已完成</div><div class="mslot glow" id="slot-take">取票口</div></div></div></div></section>
</body></html>`

/* ---------- 手机课程（连无线网 / 调大字体） ---------- */
const sec = (guide: string, why: string, action: string, target: string, html: string, dir = 'right') =>
  `<section class="sb-step" data-guide="${guide}" data-why="${why}" data-action="${action}" data-target="${target}" data-direction="${dir}"><style>${PHONE_CSS}</style>${html}</section>`

const wifiDoc = `<!doctype html><html><head><title>连接无线网络</title></head><body>
${sec('找第1排第1个，蓝色的圆形图标，里面画着齿轮，点一下。', '所有开关都在设置里', 'tap', 'icon-settings', home)}
${sec('找第2行，蓝色的长方形条目，里面画着扇形信号，点一下。', '联网要先找到网络设置', 'tap', 'row-wlan', settingsPage)}
${sec('找第1行，蓝色的长方形条目，右边有一个灰色椭圆开关，点一下。', '开关变成绿色才算打开', 'tap', 'sw-wifi', wlanPage(false))}
${sec('找第2行，绿色的长方形条目，里面画着扇形信号，点一下。', '选自己家的网最安全', 'tap', 'net-home', wlanPage(true))}
</body></html>`

const fontDoc = `<!doctype html><html><head><title>把字调大</title></head><body>
${sec('找第1排第1个，蓝色的圆形图标，里面画着齿轮，点一下。', '设置里能改手机的显示', 'tap', 'icon-settings', home)}
${sec('找第3行，橙色的长方形条目，里面画着太阳，点一下。', '字的大小在显示里面', 'tap', 'row-display', settingsPage)}
${sec('找第1行，蓝色的长方形条目，写着字体大小，点一下。', '点进去就能看到字的大小', 'tap', 'row-font', displayPage)}
${sec('按住滑条上的白色圆点，慢慢往右边拖。', '往右边拖，字就会变大', 'slider', 'slider-size', fontPage)}
</body></html>`

const docs = [wifiDoc, fontDoc, atmDoc, metroDoc]

export const demoCourses: Course[] = docs
  .map(d => parseCourseHtml(d))
  .filter((r): r is Course => 'steps' in r)
