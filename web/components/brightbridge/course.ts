export type Persona = 'child' | 'senior'
export type ActionType = 'tap' | 'long_press' | 'swipe' | 'drag' | 'slider' | 'input'
export type Direction = 'up' | 'down' | 'left' | 'right'

/** 一步的动作：类型 + 方向 + 目标（drag 有放置目标，input 有期望内容和判断式） */
export interface StepAction {
  type: ActionType
  direction: Direction
  targetId: string
  /** drag：放置目标的 id */
  dropId?: string
  /** input：要输入的内容 */
  value?: string
  /** input：AI 写的判断式，v 表示输入的内容；不写就按等于 value 判断 */
  check?: string
}

/** 一步练习：guide 形象化说明，html 是这一步的完整界面（原样渲染，不清理） */
export interface Step {
  id: string
  guide: string
  why: string
  action: StepAction
  html: string
}

export interface Course { title: string; steps: Step[] }

export type Gesture =
  | { type: 'tap' | 'long_press' | 'swipe'; direction: Direction }
  | 'invalid'

export const ACTION_TYPES: ActionType[] = ['tap', 'long_press', 'swipe', 'drag', 'slider', 'input']
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

export function classifyGesture(dx: number, dy: number, dt: number, moved: number): Gesture {
  if (moved >= 35) {
    const direction: Direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
    return { type: 'swipe', direction }
  }
  if (dt >= 600) return { type: 'long_press', direction: 'right' }
  return { type: 'tap', direction: 'right' }
}

/** 把 AI 生成的 HTML 课程文档解析成步骤列表。内容原样保留，只校验结构。 */
export function parseCourseHtml(raw: string): Course | { error: string } {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(raw, 'text/html')
  } catch {
    return { error: 'HTML 无法解析' }
  }
  const title = (doc.title || '').trim().slice(0, 20)
  if (!title) return { error: '缺少课程名 <title>' }
  const sections = Array.from(doc.querySelectorAll('section.sb-step'))
  if (sections.length < 2 || sections.length > 12) return { error: `步骤数量 ${sections.length} 不在 2 到 12 之间` }

  const steps: Step[] = []
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]
    const guide = (sec.getAttribute('data-guide') || '').trim().slice(0, 80)
    const why = (sec.getAttribute('data-why') || '').trim().slice(0, 30)
    const type = (sec.getAttribute('data-action') || '') as ActionType
    const direction = (sec.getAttribute('data-direction') || 'right') as Direction
    const targetId = (sec.getAttribute('data-target') || '').trim().slice(0, 40)
    const dropId = (sec.getAttribute('data-drop') || '').trim().slice(0, 40) || undefined
    const value = (sec.getAttribute('data-value') || '').slice(0, 40) || undefined
    const check = (sec.getAttribute('data-check') || '').slice(0, 120) || undefined

    if (!guide) return { error: `第 ${i + 1} 步缺少操作说明` }
    if (!ACTION_TYPES.includes(type)) return { error: `第 ${i + 1} 步动作类型不对` }
    if (!DIRECTIONS.includes(direction)) return { error: `第 ${i + 1} 步方向不对` }
    if (!/^[a-zA-Z][\w-]*$/.test(targetId)) return { error: `第 ${i + 1} 步目标 id 不合法` }
    if (!sec.querySelector('#' + targetId)) return { error: `第 ${i + 1} 步找不到目标元素 ${targetId}` }
    if (type === 'drag') {
      if (!dropId || !/^[a-zA-Z][\w-]*$/.test(dropId)) return { error: `第 ${i + 1} 步缺少放置目标 data-drop` }
      if (!sec.querySelector('#' + dropId)) return { error: `第 ${i + 1} 步找不到放置目标 ${dropId}` }
    }
    if (type === 'input' && !value && !check) return { error: `第 ${i + 1} 步缺少要输入的内容 data-value 或判断式 data-check` }
    if (sec.innerHTML.length > 60000) return { error: `第 ${i + 1} 步界面太大` }
    steps.push({ id: `s${i + 1}`, guide, why, action: { type, direction, targetId, dropId, value, check }, html: sec.innerHTML })
  }
  return { title, steps }
}

export function instruction(step: Step, persona: Persona): string {
  const why = persona === 'senior' && step.why ? `（${step.why}）` : ''
  return `${step.guide}${why}`
}

export function retry(level: number): string {
  if (level <= 1) return '没关系，慢慢来，再找一次。'
  if (level === 2) return '看黄色圈圈套住的地方。'
  return '我们一起做这一步，下一次你一定行。'
}
