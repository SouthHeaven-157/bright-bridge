"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { EMOTION_TAVERN_PATH, shouldOpenEmotionTavern } from '../../lib/bridge/navigation'
import { Icon } from './Icons'
import { demoCourses } from './demoCourses'
import {
  type Course, type Gesture, type Persona, type Step,
  classifyGesture, instruction, parseCourseHtml, retry,
} from './course'

type Phase = 'home' | 'generating' | 'pick' | 'practice' | 'done'
type Mood = 'normal' | 'happy' | 'care'

/** Web Speech API 的事件类型（TS 标准 DOM 库里没有） */
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number; [index: number]: SRAlternative }
interface SRResultList { 0: SRResult; length: number; [index: number]: SRResult }
interface SREvent { results: SRResultList }

const cheerLines = {
  child: ['你做对啦！', '真棒真棒！', '哇，好厉害！', '给自己鼓个掌！'],
  senior: ['做对了，很好。', '没错，就是它。', '很顺利，继续。', '就是这样，你记得真牢。'],
}
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

function matchesInputCheck(check: string, value: string) {
  const length = check.match(/^v\.length\s*===\s*(\d{1,3})$/)
  if (length) return value.length === Number(length[1])
  const includes = check.match(/^v\.includes\((['"])(.{1,40})\1\)$/)
  if (includes) return value.includes(includes[2])
  return false
}

/** 小引导员的脸：会眨眼，心情好会变表情。 */
function Face({ mood }: { mood: Mood }) {
  const mouth = mood === 'happy' ? 'M14 29q10 9 20 0'
    : mood === 'care' ? 'M16 31q8 -5 16 0'
      : 'M15 30q9 6 18 0'
  return (
    <svg viewBox="0 0 48 48" className="face" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#ffd98a" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="#e8a13c" strokeWidth="2" />
      <circle className="eye" cx="16.5" cy="20" r="2.7" fill="#5b3a12" />
      <circle className="eye" cx="31.5" cy="20" r="2.7" fill="#5b3a12" />
      <path d={mouth} stroke="#5b3a12" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {mood === 'happy' && <>
        <circle cx="10" cy="27" r="2.4" fill="#ff9e9e" opacity=".7" />
        <circle cx="38" cy="27" r="2.4" fill="#ff9e9e" opacity=".7" />
      </>}
    </svg>
  )
}

/** 引导文字一个字一个字蹦出来：跟着读更专注，也更有陪练的感觉 */
function Typewriter({ text, slow }: { text: string; slow?: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => { setN(0) }, [text])
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN(n + 1), slow ? 70 : 45)
    return () => clearTimeout(t)
  }, [n, text, slow])
  return <>{text.slice(0, n)}<i className="caret" /></>
}

/**
 * 仿真舞台：AI 画的界面放进 iframe 原样渲染（脚本、外链照常运行），
 * 父页面在 iframe document 上注入六种动作判定：
 * tap / long_press / swipe / drag（拖到放置区）/ slider（拖滑条）/ input（输入内容）。
 */
function Stage({
  step, persona, onSuccess, onWrong, onInvalid, shake, cheer,
}: {
  step: Step
  persona: Persona
  onSuccess: () => void
  onWrong: (g: Gesture) => void
  onInvalid: () => void
  shake: boolean
  cheer: boolean
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const stepRef = useRef(step)
  const cbRef = useRef({ onSuccess, onWrong, onInvalid })
  stepRef.current = step
  cbRef.current = { onSuccess, onWrong, onInvalid }

  const scale = persona === 'senior' ? 1.12 : 1
  // step.html 是 section.innerHTML，不包含 section 标签本身。
  // 但生成的 CSS 全部以 .sb-step 为祖先选择器（如 .sb-step .phone），
  // 所以必须用 section 包裹，否则所有生成样式失效。
  const srcDoc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;padding:0;height:100%;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
body{font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;color:#1d2b36;font-size:${16 * scale}px}
input,textarea{user-select:text;-webkit-user-select:text}
.sb-target{outline:4px solid #e8a13c !important;outline-offset:3px;border-radius:12px;animation:sbglow 1.2s infinite !important}
.sb-drop{outline:4px dashed #2faa6b !important;outline-offset:3px;border-radius:12px;animation:sbglow 1.2s infinite !important}
.sb-drop-hot{outline:6px solid #2faa6b !important;box-shadow:0 0 0 8px rgba(47,170,107,.25) inset,0 0 18px rgba(47,170,107,.5) !important;background-color:rgba(47,170,107,.12) !important}
@keyframes sbglow{50%{outline-color:rgba(232,161,60,.25)}}
</style></head><body><section class="sb-step" style="display:block;width:100%;height:100%">${step.html}</section></body></html>`, [step, scale])

  const handleLoad = () => {
    const doc = frame.current?.contentDocument
    if (!doc) return
    const act = () => stepRef.current.action
    const a0 = act()
    // drag 的放置区用绿色虚线（这个一开始就显示，不影响判断）
    if (a0.dropId) doc.getElementById(a0.dropId)?.classList.add('sb-drop')

    // 黄色高亮框：首次不显示，错一次后再提示目标在哪
    let attempt = 0
    let lastWrongEl: Element | null = null
    const showHint = () => {
      if (attempt === 1 && lastWrongEl) lastWrongEl.classList.add('sb-target')
    }
    const wrapWrong = (g: Gesture) => {
      attempt++
      lastWrongEl = doc.getElementById(act().targetId) || null
      showHint()
      cbRef.current.onWrong(g)
    }
    const wrapInvalid = () => {
      attempt++
      lastWrongEl = doc.getElementById(act().targetId) || null
      showHint()
      cbRef.current.onInvalid()
    }

    // input 步骤：保证目标真的能打字——真输入框去掉只读，画出来的假框转成可编辑，并自动聚焦
    if (a0.type === 'input') {
      const el = doc.getElementById(a0.targetId)
      if (el) {
        el.removeAttribute('readonly')
        el.removeAttribute('disabled')
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.setAttribute('contenteditable', 'true')
        setTimeout(() => el.focus(), 80)
      }
    }

    // 跨 iframe 不能用 instanceof，用鸭子类型判断元素
    const closest = (node: EventTarget | null, sel: string): Element | null => {
      if (!node || typeof (node as { closest?: unknown }).closest !== 'function') return null
      return (node as Element).closest(sel)
    }

    let down: { x: number; y: number; t: number; moved: number; onTarget: boolean } | null = null
    let holdTimer: number | undefined
    let settled = false

    // input：输入内容符合就成功（不需要松手）。空格不算，避免断在空格上。
    // AI 可以在 data-check 写任何判断式（v 表示当前输入内容）；不写就按等于 data-value 匹配。
    if (a0.type === 'input') {
      doc.addEventListener('input', e => {
        if (settled) return
        const el = closest(e.target, '#' + act().targetId)
        if (!el) return
        const a = act()
        const raw = ((el as HTMLInputElement).value ?? el.textContent ?? '').trim()
        if (!raw) return
        if (a.check) {
          const ok = matchesInputCheck(a.check, raw)
          if (ok) { settled = true; cbRef.current.onSuccess() }
        } else {
          const val = raw.replace(/\s/g, '')
          const want = (a.value || '').replace(/\s/g, '')
          if (val === want) { settled = true; cbRef.current.onSuccess() }
        }
      })
    }

    // 拖动跟手：按住目标时记录被拖元素和它原来的 transform，移动中实时平移，松手复位
    let dragEl: Element | null = null
    let dragBase = ''
    let dragPE = ''
    let hotEl: Element | null = null
    const finishDrag = () => {
      if (dragEl) {
        const s = (dragEl as HTMLElement).style
        s.transform = dragBase
        s.zIndex = ''
        s.transition = ''
        s.pointerEvents = dragPE
        dragEl = null
      }
      if (hotEl) { hotEl.classList.remove('sb-drop-hot'); hotEl = null }
    }

    doc.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY, t: Date.now(), moved: 0, onTarget: !!closest(e.target, '#' + act().targetId) }
      settled = false
      const a = act()
      // drag / slider：按住目标就开始跟手移动
      if ((a.type === 'drag' || a.type === 'slider') && down.onTarget) {
        dragEl = closest(e.target, '#' + a.targetId)
        if (dragEl) {
          const s = (dragEl as HTMLElement).style
          dragBase = s.transform
          dragPE = s.pointerEvents
          s.transition = 'none'
          s.zIndex = '99'
          // 跟手移动后它会挡在指针下，禁掉命中检测才能看到下面的放置区
          s.pointerEvents = 'none'
        }
      }
      if (a.type === 'long_press' && down.onTarget) {
        holdTimer = window.setTimeout(() => {
          if (down && down.moved < 12 && !settled) { settled = true; cbRef.current.onSuccess() }
        }, 600)
      }
    })
    doc.addEventListener('pointermove', e => {
      if (!down) return
      down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y))
      if (!dragEl) return
      const a = act()
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (a.type === 'slider') {
        // 滑块只沿指定方向那条轴动
        const t = a.direction === 'left' || a.direction === 'right'
          ? `translate(${dx}px,0)` : `translate(0,${dy}px)`
        ;(dragEl as HTMLElement).style.transform = t
      } else {
        ;(dragEl as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`
        // 拖到放置区上方时给绿色实心高亮
        const land = closest(doc.elementFromPoint(e.clientX, e.clientY), '#' + (a.dropId || ''))
        if (hotEl && hotEl !== land) hotEl.classList.remove('sb-drop-hot')
        if (land) land.classList.add('sb-drop-hot')
        hotEl = land
      }
    })
    // 手指移出或系统打断拖动也要复位，不然元素停在半路
    doc.addEventListener('pointercancel', () => { finishDrag(); down = null })
    doc.addEventListener('pointerleave', () => { finishDrag(); down = null })
    doc.addEventListener('pointerup', e => {
      if (holdTimer !== undefined) { clearTimeout(holdTimer); holdTimer = undefined }
      finishDrag()
      if (!down || settled) { down = null; return }
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      const dt = Date.now() - down.t
      const moved = Math.hypot(dx, dy)
      const started = down.onTarget
      const a = act()
      down = null

      // input 步骤：点按只当聚焦，不算对错
      if (a.type === 'input') return

      // drag：必须从目标按起，松手时指针在放置区内
      if (a.type === 'drag') {
        const over = doc.elementFromPoint(e.clientX, e.clientY)
        const landed = !!closest(over, '#' + (a.dropId || ''))
        return started && landed ? cbRef.current.onSuccess() : wrapWrong({ type: 'tap', direction: 'right' })
      }

      // slider：必须按住圆点，沿指定方向拖出足够距离
      if (a.type === 'slider') {
        const dist = a.direction === 'left' ? -dx : a.direction === 'right' ? dx : a.direction === 'up' ? -dy : dy
        return started && dist >= 40 ? cbRef.current.onSuccess() : wrapWrong({ type: 'tap', direction: 'right' })
      }

      // tap / long_press / swipe：手势分类 + 目标命中
      const g = classifyGesture(dx, dy, dt, moved)
      const hit = !!closest(e.target, '#' + a.targetId)
      if (g === 'invalid') return wrapInvalid()
      if (!hit) return wrapWrong(g)
      const right = g.type === a.type && (g.type !== 'swipe' || g.direction === a.direction)
      right ? cbRef.current.onSuccess() : wrapWrong(g)
    })
  }

  return (
    <div className={`stage${shake ? ' shake' : ''}${cheer ? ' cheer' : ''}`}>
      <iframe
        key={step.id}
        ref={frame}
        title="仿真界面"
        sandbox="allow-same-origin"
        srcDoc={srcDoc}
        onLoad={handleLoad}
      />
    </div>
  )
}

/** 等待生成时的小游戏：点泡泡，吸引注意力 */
function BubbleGame() {
  const [score, setScore] = useState(0)
  const [bubbles, setBubbles] = useState<{ id: number; left: number; dur: number; color: string; size: number }[]>([])
  const idRef = useRef(0)
  useEffect(() => {
    const colors = ['#f4b740', '#2faa6b', '#3d8fdd', '#e2604f', '#8a6fd6']
    const spawn = setInterval(() => {
      setBubbles(bs => bs.length >= 6 ? bs : [...bs, {
        id: idRef.current++,
        left: 6 + Math.random() * 80,
        dur: 4.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 46 + Math.random() * 28,
      }])
    }, 800)
    return () => clearInterval(spawn)
  }, [])
  const gone = (id: number) => setBubbles(bs => bs.filter(b => b.id !== id))
  return (
    <div className="bubblegame">
      <p>等的时候点一点泡泡玩：<b>{score}</b></p>
      <div className="pond">
        {bubbles.map(b => (
          <i
            key={b.id}
            style={{ left: `${b.left}%`, background: b.color, width: b.size, height: b.size, animationDuration: `${b.dur}s` }}
            onClick={() => { gone(b.id); setScore(s => s + 1) }}
            onAnimationEnd={() => gone(b.id)}
          />
        ))}
      </div>
    </div>
  )
}

function App() {
  // 模式：第一次选完记住，之后主页不再出现模式切换，想改去角落的设置里
  const [persona, setPersona] = useState<Persona>('senior')
  const [needPersona, setNeedPersona] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [task, setTask] = useState('')
  const [course, setCourse] = useState<Course>()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('home')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('') // 按住说话时的实时字幕
  const recRef = useRef<{ stop(): void } | null>(null)
  const [banner, setBanner] = useState('')
  const [errors, setErrors] = useState(0)
  const [shake, setShake] = useState(false)
  const [cheer, setCheer] = useState(false)
  const [mood, setMood] = useState<Mood>('normal')
  const [review, setReview] = useState<number[]>([])
  const [stage, setStage] = useState(0) // 生成页进度动画
  // 摄像头：detect = 扫行为自动开课，guide = 练习中实时指导
  const [camMode, setCamMode] = useState<'off' | 'detect' | 'guide'>('off')
  const [camHint, setCamHint] = useState('')
  // 参考图（界面截图/机器照片）：随任务发给 AI 照着画，练习时还能对照看
  const [refImages, setRefImages] = useState<string[]>([])
  const [refIdx, setRefIdx] = useState(0)
  const [showRefs, setShowRefs] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // 这门课获得的星星（做对一步一颗）
  const [stars, setStars] = useState(0)
  // 一次生成多个练习：并发生成队列 + 选择页
  const [genQueue, setGenQueue] = useState<{ task: string; status: 'loading' | 'ok' | 'fail'; course?: Course }[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const busyRef = useRef(false)      // 视觉请求防重入
  const lastHintRef = useRef('')     // 同一句提示不重复播报
  const guideRef = useRef('')        // 当前步骤说明，给视觉接口用

  useEffect(() => {
    const saved = localStorage.getItem('sb-persona')
    if (saved === 'child' || saved === 'senior') setPersona(saved)
    setNeedPersona(!saved)
  }, [])

  const speak = (s: string) => {
    speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance(s)
    u.rate = persona === 'senior' ? 0.8 : 0.85
    speechSynthesis?.speak(u)
  }
  useEffect(() => () => speechSynthesis?.cancel(), [])

  const current = course?.steps[Math.min(step, (course?.steps.length ?? 1) - 1)]

  // 当前步骤说明同步给视觉接口；换步骤后允许重新播报
  useEffect(() => { guideRef.current = current ? instruction(current, persona) : '' }, [current, persona])
  useEffect(() => { lastHintRef.current = '' }, [step])

  /** 从摄像头截一帧，缩到 480 宽的 jpeg dataUrl */
  const captureFrame = (): string | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    const w = 480
    const h = Math.round(video.videoHeight / video.videoWidth * w) || 360
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.6)
  }

  const openCam = async (mode: 'detect' | 'guide') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 }, audio: false })
      streamRef.current = stream
      setCamHint('')
      setCamMode(mode)
    } catch {
      setBanner('摄像头打不开，请允许浏览器使用摄像头。')
    }
  }

  const closeCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamMode('off')
    setCamHint('')
  }

  // camMode 变化后 video 元素才渲染，这里把流接上
  useEffect(() => {
    if (camMode !== 'off' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camMode])

  // 卸载时关流
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  /** 第一次选定或设置里改模式：记住选择，主页不再出现模式切换 */
  const choosePersona = (p: Persona) => {
    setPersona(p)
    localStorage.setItem('sb-persona', p)
    setNeedPersona(false)
  }

  /** 点一下开始听，再点一下停止，只负责把听到的文字显示出来 */
  const toggleTalk = () => {
    // 正在听 → 再点一下就停
    if (listening) { recRef.current?.stop(); return }
    const w = window as unknown as Record<string, unknown>
    type Rec = new () => {
      lang: string
      interimResults: boolean
      start(): void
      stop(): void
      onresult: ((e: SREvent) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
    }
    const R = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as Rec | undefined
    if (!R) return setBanner('这个浏览器不支持语音输入，请换 Chrome 或 Edge 打开。')
    const r = new R()
    r.lang = 'zh-CN'
    r.interimResults = true
    setListening(true); setInterim('')
    r.onresult = (e: SREvent) => {
      const res = e.results[e.results.length - 1]
      const text = res[0].transcript
      const spoken = text.trim()
      // 浏览器有时只给临时结果就结束识别，触发词不必等待 isFinal。
      if (shouldOpenEmotionTavern(spoken)) {
        r.stop()
        window.location.assign(EMOTION_TAVERN_PATH)
        return
      }
      if (res.isFinal) {
        setListening(false); setInterim('')
        if (spoken) setTask(spoken)
      } else setInterim(text)
    }
    r.onerror = () => { setListening(false); setInterim(''); setBanner('没听清，再点一下按钮重新说。') }
    r.onend = () => setListening(false)
    recRef.current = r
    r.start()
  }

  /** 选中的图压缩到 720 宽的 jpeg，截图几兆也能很快发出去 */
  const fileToImage = (file: File): Promise<string> => new Promise((ok, no) => {
    const fr = new FileReader()
    fr.onerror = no
    fr.onload = () => {
      const img = new Image()
      img.onerror = no
      img.onload = () => {
        const w = Math.min(720, img.width)
        const h = Math.round(img.height / img.width * w) || 540
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d')?.drawImage(img, 0, 0, w, h)
        ok(c.toDataURL('image/jpeg', 0.72))
      }
      img.src = String(fr.result)
    }
    fr.readAsDataURL(file)
  })

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).slice(0, 3) : []
    e.target.value = ''
    if (files.length === 0) return
    try {
      const imgs = await Promise.all(files.map(fileToImage))
      setRefImages(a => [...a, ...imgs].slice(0, 3))
      // 拍了不会用的东西：直接照着照片出练习，不用再说话打字
      generateMulti(['照着我拍的图，教我用图里的东西'], '', imgs)
    } catch {
      setBanner('这张照片打不开，换一张再拍。')
    }
  }

  const startCourse = (c: Course, note: string) => {
    setCourse(c); setStep(0); setErrors(0); setReview([]); setMood('normal'); setPhase('practice'); setStars(0)
    setBanner(note)
    speak(instruction(c.steps[0], persona))
  }

  /** 一次生成一个练习（语音入口）；带着参考图让 AI 照着画 */
  const generate = (input = task) => {
    if (!input.trim()) return setBanner('请先按住大按钮，说出想学的事。')
    void generateMulti([input], '', refImages)
  }

  /** 多线程：多个练习同时并发生成，全部完成后一个就直接开始，多个进选择页 */
  const generateMulti = async (tasks: string[], note = '', images: string[] = []) => {
    const list = tasks.map(t => t.trim()).filter(Boolean).slice(0, 3)
    if (list.length === 0) return setBanner('AI 这次没安排好，说一说想学什么吧。')
    setPhase('generating'); setStage(0); setBanner('')
    setGenQueue(list.map(t => ({ task: t, status: 'loading' })))
    const timer = setInterval(() => setStage(s => (s + 1) % 3), 1200)
    // 并发：每个练习一条独立请求，谁先回来谁先显示完成（参考图只给第一个任务，它是用户亲口说的那件）
    const results = await Promise.allSettled(list.map(async (t, i) => {
      try {
        const res = await fetch('/api/bridge/generate-course', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: t, persona, images: i === 0 ? images : [] }),
        })
        const data = await res.json() as { html?: string }
        if (!res.ok || !data.html) return undefined
        const parsed = parseCourseHtml(data.html)
        if ('error' in parsed) return undefined
        setGenQueue(q => q.map((g, j) => j === i ? { ...g, status: 'ok', course: parsed } : g))
        return parsed
      } catch {
        return undefined
      }
    }))
    clearInterval(timer)
    const courses = results.map(r => (r.status === 'fulfilled' ? r.value : undefined))
    setGenQueue(q => q.map((g, i) => courses[i] ? { ...g, status: 'ok', course: courses[i] } : { ...g, status: 'fail' }))
    const ready = courses.filter((c): c is Course => !!c)
    if (ready.length === 0) {
      setBanner('AI 这次没生成好，已换成本地课程。')
      startCourse(demoCourses[0], '')
    } else if (ready.length === 1) {
      startCourse(ready[0], note || `AI 为你生成好了：${ready[0].title}`)
    } else {
      setPhase('pick')
      speak('练习都准备好了，选一个开始吧')
    }
  }

  /* 摄像头扫一扫：本地连拍几帧（不逐帧调接口），攒够一次打包识别，再并发生成多个练习 */
  useEffect(() => {
    if (camMode !== 'detect') return
    let stopped = false
    let ticks = 0
    const frames: string[] = []
    const MAX = 5
    const tick = async () => {
      if (stopped) return
      ticks++
      const image = captureFrame()
      if (!image) {
        if (ticks >= 12) { setBanner('摄像头没有画面，检查一下再试。'); closeCam() }
        return
      }
      frames.push(image)
      setCamHint(`正在多看几眼…（第 ${frames.length} / ${MAX} 眼）`)
      if (frames.length < MAX) return
      // 攒够了：多帧一起识别
      closeCam()
      setPhase('generating'); setStage(0); setBanner('')
      speak('我看清楚你想做的事了，马上给你准备几个练习')
      try {
        const res = await fetch('/api/bridge/vision-frames', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: frames, persona }),
        })
        const data = await res.json() as { practices?: { task: string }[]; error?: string }
        const tasks = res.ok ? (data.practices ?? []).map(p => p.task).filter(Boolean).slice(0, 3) : []
        if (tasks.length === 0) throw new Error('empty')
        await generateMulti(tasks)
      } catch {
        setBanner('AI 这次没看明白，说一说想学什么吧。')
        setPhase('home')
      }
    }
    const timer = setInterval(tick, 2000)
    tick()
    return () => { stopped = true; clearInterval(timer) }
  }, [camMode])

  /* 摄像头指导：练习中每 6 秒看一帧，判断你做得对不对，偏了就开口提醒 */
  useEffect(() => {
    if (camMode !== 'guide' || phase !== 'practice') return
    let stopped = false
    let fails = 0
    const tick = async () => {
      if (stopped || busyRef.current) return
      const image = captureFrame()
      if (!image) return
      busyRef.current = true
      try {
        const res = await fetch('/api/bridge/vision-check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, guide: guideRef.current, persona }),
        })
        const data = await res.json() as { onTrack?: boolean; hint?: string; error?: string }
        if (stopped) return
        if (res.ok) {
          fails = 0
          setCamHint(data.hint || '我正在看着你练习…')
          if (data.onTrack === false && data.hint && data.hint !== lastHintRef.current) {
            lastHintRef.current = data.hint
            speak(data.hint)
          }
        } else {
          fails++
          if (fails >= 3) { setBanner('摄像头指导暂时不可用，已关闭。'); closeCam() }
        }
      } catch { /* 网络抖动忽略 */ } finally { busyRef.current = false }
    }
    const timer = setInterval(tick, 6000)
    tick()
    return () => { stopped = true; clearInterval(timer) }
  }, [camMode, phase, persona])

  // 离开练习页自动关掉指导摄像头
  useEffect(() => { if (phase !== 'practice' && camMode === 'guide') closeCam() }, [phase, camMode])

  const advance = (needReview: boolean) => {
    if (!course) return
    if (needReview) setReview(r => [...r, step + 1])
    const next = step + 1
    if (next < course.steps.length) {
      setStep(next); setErrors(0)
      speak(instruction(course.steps[next], persona))
    } else {
      setStep(next); setPhase('done')
      speak(persona === 'child' ? '你做对啦，全部完成！' : '练习完成，你已经学会了')
    }
  }

  const wrongHint = (g: Gesture) => {
    if (!current || g === 'invalid') return '再试一次。'
    const a = current.action
    if (a.type === 'long_press' && g.type === 'tap') return '要按住不动，等它变颜色。'
    if (a.type === 'swipe' && g.type === 'tap') return '要按住不放，往箭头方向滑动。'
    if (a.type === 'drag') return '要按住它，拖到绿色虚线框的地方再松手。'
    if (a.type === 'slider') return '要按住圆点，往要去的方向拖远一点再松手。'
    if (a.type === 'input') return '点一下输入框，把要打的内容打进去。'
    return retry(errors)
  }

  const onWrong = (g: Gesture) => {
    const n = errors + 1; setErrors(n)
    setShake(true); setMood('care')
    setTimeout(() => { setShake(false); setMood('normal') }, 1000)
    if (n >= 3) {
      setBanner('没关系，我拉着你一起完成这一步。')
      advance(true)
    } else {
      const msg = wrongHint(g)
      setBanner(msg); speak(msg)
    }
  }

  return (
    <main className={`brightbridge-app ${persona}`}>
      {/* 软件名缩在角落，主界面留给练习本身 */}
      <header className="appbar">
        <div className="appbrand">
          <img src="/bridge/logo.png" alt="" className="applogo" />
          <small className="appname">智触心桥</small>
        </div>
        <button className="gearbtn" onClick={() => setShowSettings(s => !s)} aria-label="设置">
          <Icon name="gear" />
        </button>
      </header>

      {/* 角落的设置：平时不出现，家属/陪同者可以在这里改模式 */}
      {showSettings && (
        <div className="settings">
          <b>给谁练：</b>
          <button className={persona === 'senior' ? 'on' : ''} onClick={() => choosePersona('senior')}>老人 / 数字新手</button>
          <button className={persona === 'child' ? 'on' : ''} onClick={() => choosePersona('child')}>儿童 / 学生</button>
          <button className="ghost" onClick={() => setShowSettings(false)}>好</button>
        </div>
      )}

      {/* 第一次启动：选一次谁来用，之后记住不再问 */}
      {needPersona && (
        <div className="whoPage">
          <h1>谁来练习？</h1>
          <p className="sub">选一次就行，以后可以直接开始</p>
          <div className="whocards">
            <button className="whocard" onClick={() => choosePersona('senior')}>
              <Icon name="user" />
              <b>老人 / 数字新手</b>
              <span>字更大，说得更慢，一步一步带着练</span>
            </button>
            <button className="whocard" onClick={() => choosePersona('child')}>
              <Icon name="star" />
              <b>儿童 / 学生</b>
              <span>像小游戏，做对一步得一颗星</span>
            </button>
          </div>
        </div>
      )}

      {phase === 'home' && (
        <section className="page home">
          <div className="safestrip">
            <Icon name="shield" />
            <span>在这里随便点：不会弄坏，也不会扣钱</span>
          </div>
          <h1 className="homeTitle">想学什么？</h1>
          <p className="homeSub">点一下按钮开始说</p>
          <div className={`heard${listening || task ? '' : ' dim'}`}>
            {listening ? (interim || '在听你说…') : (task || '你说的话会出现在这里')}
          </div>
          {/* 有内容后才出现：让用户确认再生成，方便中断/修改 */}
          {task && !listening && (
            <button className="startbtn" onClick={() => generate()}>
              开始练习
            </button>
          )}
          <button
            className={`micbig${listening ? ' rec' : ''}`}
            onClick={toggleTalk}
          >
            <Icon name="mic" />
            <b>{listening ? '点一下停止' : '点一下说话'}</b>
          </button>
          <div className="homeDivider" />
          <button className="photobig" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" />
            <b>拍一下不会用的东西</b>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
          <button className="minilink" onClick={() => openCam('detect')}>
            <Icon name="video" /><span>让摄像头看看我在做什么</span>
          </button>
          <div className="quick">
            <span>不用等，直接练：</span>
            <div className="qrow">
              {demoCourses.map(c => (
                <button key={c.title} onClick={() => startCourse(c, '本地课程，一样可以练。')}>{c.title}</button>
              ))}
            </div>
          </div>
          {banner && <p className="banner">{banner}</p>}
        </section>
      )}

      {phase === 'generating' && (
        <section className="page gen">
          <Face mood="normal" />
          <h1>我正在准备…</h1>
          {genQueue.length === 0 ? (
            <ol>
              {['听懂你说的事', '拆成小步骤', '画出练习界面'].map((s, i) => (
                <li key={s} className={i <= stage ? 'on' : ''}>{s}…</li>
              ))}
            </ol>
          ) : (
            <ul className="genlist">
              {genQueue.map(g => (
                <li key={g.task} className={g.status}>
                  {g.status === 'ok' ? '✓ 好了：' : g.status === 'fail' ? '× 没画好：' : '… 正在画：'}
                  {g.task}
                </li>
              ))}
            </ul>
          )}
          <p className="banner">同时画几个要一点时间，可以先点点下面的泡泡。</p>
          <BubbleGame />
          <button className="ghost" onClick={() => { setGenQueue([]); setPhase('home') }}>返回</button>
        </section>
      )}

      {phase === 'pick' && (
        <section className="page pick">
          <Face mood="happy" />
          <h1>给你准备了 {genQueue.filter(g => g.course).length} 个练习</h1>
          <p className="sub">点一个开始</p>
          {genQueue.filter((g): g is { task: string; status: 'ok'; course: Course } => !!g.course).map(g => (
            <button className="pickcard" key={g.task} onClick={() => startCourse(g.course, 'AI 为你生成好了。')}>
              <b>{g.course.title}</b>
              <span>{g.task}</span>
            </button>
          ))}
          <button className="ghost" onClick={() => { setGenQueue([]); setPhase('home') }}>都不是，我重新说</button>
        </section>
      )}

      {phase === 'practice' && course && current && (
        <section className="page practice">
          <div className="topbar">
            <button className="ghost" onClick={() => setPhase('home')}>← 退出</button>
            <span className="steps-tag">{course.title} · 第 {step + 1} / {course.steps.length} 步</span>
            <button className="ghost" onClick={() => speak(instruction(current, persona))}>重听</button>
            <button className="ghost" onClick={() => (camMode === 'guide' ? closeCam() : openCam('guide'))}>
              {camMode === 'guide' ? '关闭摄像头' : '摄像头指导'}
            </button>
            {refImages.length > 0 && (
              <button className="ghost" onClick={() => { setRefIdx(0); setShowRefs(true) }}>看参考图</button>
            )}
          </div>
          <div className="mascot">
            <Face mood={mood} />
            <div className="bubble"><Typewriter text={instruction(current, persona)} slow={persona === 'senior'} /></div>
            {stars > 0 && (
              <span className="stars" aria-label={`已得 ${stars} 颗星`}>
                {Array.from({ length: stars }, (_, i) => <Icon key={i} name="star" />)}
              </span>
            )}
          </div>
          <div className="dots">{course.steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
          <Stage
            step={current}
            persona={persona}
            onSuccess={() => {
              setCheer(true); setMood('happy'); setStars(s => s + 1)
              setTimeout(() => { setCheer(false); setMood('normal') }, 900)
              setBanner(pick(cheerLines[persona]))
              advance(false)
            }}
            onWrong={onWrong}
            onInvalid={() => setBanner('手别抖，重新按一次。')}
            shake={shake}
            cheer={cheer}
          />
          {banner && <p className="banner">{banner}</p>}
        </section>
      )}

      {phase === 'done' && course && (
        <section className="page done">
          <div className="confetti" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 8) * 0.18}s`,
                background: ['#f4b740', '#2faa6b', '#3d8fdd', '#e2604f', '#8a6fd6'][i % 5],
              }} />
            ))}
          </div>
          <Face mood="happy" />
          <h1>{persona === 'child' ? '你做对啦！全部完成！' : '全部完成，你已经学会了'}</h1>
          {stars > 0 && (
            <div className="bigstars" aria-label={`共得 ${stars} 颗星`}>
              {Array.from({ length: stars }, (_, i) => <Icon key={i} name="star" />)}
              <span>得到 {stars} 颗星</span>
            </div>
          )}
          <p className="sub">刚才是安全仿真练习，真实设备一点都没被动过。</p>
          <div className="learned">
            <b>这一课：{course.title}</b>
            {course.steps.map((s, i) => (
              <div key={s.id} className={review.includes(i + 1) ? 'row review' : 'row'}>
                <Icon name="check" /><span>{instruction(s, persona)}</span>
              </div>
            ))}
          </div>
          {review.length > 0 && <p className="banner">带 ⚠ 的步骤建议再练一次。</p>}
          <div className="btns">
            <button className="go" onClick={() => startCourse(course, '再来一遍。')}>再练一次</button>
            <button className="ghost" onClick={() => { setCourse(undefined); setTask(''); setPhase('home') }}>学新的事情</button>
          </div>
        </section>
      )}
      {showRefs && refImages.length > 0 && (
        <div className="refviewer" onClick={() => setShowRefs(false)}>
          <b>参考图 {refIdx + 1} / {refImages.length}（对照着找，点一下任意处关闭）</b>
          <img src={refImages[Math.min(refIdx, refImages.length - 1)]} alt="参考图" onClick={e => e.stopPropagation()} />
          {refImages.length > 1 && (
            <button className="ghost" onClick={e => { e.stopPropagation(); setRefIdx(i => (i + 1) % refImages.length) }}>换一张</button>
          )}
        </div>
      )}
      {camMode !== 'off' && (
        <div className="campanel">
          <video ref={videoRef} playsInline muted />
          <div className="camstatus">
            <i className="dot" />
            <span>{camHint || (camMode === 'detect' ? '正在看你在做什么…' : '正在看着你练习…')}</span>
          </div>
          <button className="camclose" onClick={closeCam} aria-label="关闭摄像头">×</button>
        </div>
      )}
    </main>
  )
}

export { App as BrightBridgeApp }
