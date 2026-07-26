// src/lib/weeklyFramework.js
// A 4-week rotating Sunday-evening reflection framework.
// Week number is derived from the ISO week of the year, so the cycle advances
// on its own and lands on the same phase for any given calendar week.

export const FRAMEWORKS = [
  {
    week: 1,
    title: 'First Principles',
    subtitle: 'See the essence',
    color: '#A78BFA',
    minutes: 15,
    questions: [
      "What was the biggest problem you ran into this week?",
      "What's the surface-level cause? And the real cause underneath? (Ask 'why' at least 3 times)",
      "If you flip it around, could it be something else entirely?",
      "How do you want to solve this root problem next week?",
    ],
  },
  {
    week: 2,
    title: 'System Thinking',
    subtitle: 'Build the system',
    color: '#60A5FA',
    minutes: 15,
    questions: [
      "What did you solve last week? Was it a one-off patch, or did you build a system?",
      "Across work / health / relationships — which area most needs a *system* rather than more effort?",
      "What are the three key nodes of that system?",
      "Which system's first step will you start installing this week?",
    ],
  },
  {
    week: 3,
    title: 'Rare Skills + Long-term',
    subtitle: 'Compound the craft',
    color: '#34D399',
    minutes: 15,
    questions: [
      "Which rare skill did you genuinely invest in this week? (Coding / AI / Writing / Speaking)",
      "Quantify the investment: hours spent, or what you produced?",
      "What does this skill look like one year from now?",
      "How will you increase the compounding density of that skill next week?",
    ],
  },
  {
    week: 4,
    title: 'Let Go + Direction',
    subtitle: 'Release and re-aim',
    color: '#F472B6',
    minutes: 15,
    questions: [
      "What did you cling to most this week? Can you actually control it?",
      "If you can't control it, how do you accept it? Where is the part you *can* control?",
      "Is your current direction (work / learning / relationships) the right track?",
      "Is the ladder against the right wall? If it's off, what do you adjust next week?",
    ],
  },
]

// ISO week number (1-53) for a given date.
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7          // Monday=1 ... Sunday=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum) // shift to the week's Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
}

// Which of the 4 frameworks belongs to the given date's week.
export function frameworkForDate(d = new Date()) {
  const idx = (isoWeek(d) - 1) % 4
  return FRAMEWORKS[idx]
}

// Sunday evening is the intended ritual slot.
export function isRitualTime(d = new Date()) {
  return d.getDay() === 0 && d.getHours() >= 17
}

// Sunday at all (so the card can surface earlier in the day as a heads-up).
export function isSunday(d = new Date()) {
  return d.getDay() === 0
}

// Days until the next Sunday (0 if today is Sunday).
export function daysUntilSunday(d = new Date()) {
  return (7 - d.getDay()) % 7
}
