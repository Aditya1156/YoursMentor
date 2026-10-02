import {
  Binary, BookOpen, Braces, GraduationCap, LineChart, Rocket, Target, Terminal,
} from 'lucide-react'

/**
 * Education motifs drifting behind the hero.
 *
 * Icons rather than photographs, for the same reason the product visual is
 * drawn: stock images of students would be strangers standing in for our
 * users. These are weightless, inherit the theme, and carry the subject
 * matter — a cap, a terminal, a chart — without pretending to be anything.
 *
 * aria-hidden throughout. Positions are fixed percentages so the layout is
 * identical on the server and the client.
 */
const GLYPHS = [
  { Icon: GraduationCap, top: '12%', left: '6%', size: 34, drift: 'float-slower' },
  { Icon: Braces, top: '68%', left: '3%', size: 26, drift: 'float-slow' },
  { Icon: Terminal, top: '26%', left: '88%', size: 28, drift: 'float-slow' },
  { Icon: LineChart, top: '74%', left: '92%', size: 30, drift: 'float-slower' },
  { Icon: BookOpen, top: '82%', left: '18%', size: 24, drift: 'float-slow' },
  { Icon: Rocket, top: '8%', left: '72%', size: 24, drift: 'float-slower' },
  { Icon: Target, top: '46%', left: '95%', size: 22, drift: 'float-slow' },
  { Icon: Binary, top: '88%', left: '62%', size: 22, drift: 'float-slower' },
]

export function GlyphField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {GLYPHS.map(({ Icon, top, left, size, drift }, i) => (
        <Icon
          key={i}
          className={`glyph ${drift}`}
          style={{ top, left, width: size, height: size, animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </div>
  )
}
