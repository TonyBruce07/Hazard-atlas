import { Camera, ScanSearch, Wrench, Sparkles, Copy, Gauge, Flame } from 'lucide-react'

export const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/report', label: 'Report a Hazard' },
  { to: '/map', label: 'Explore Map' },
  { to: '/dashboard', label: 'Authority Dashboard' },
]

export const HAZARD_TYPES = [
  'Potholes',
  'Damaged surfaces',
  'Uncovered manholes',
  'Road obstructions',
  'Unsafe crossings',
]

export const STEPS = [
  {
    id: 'report',
    number: '01',
    icon: Camera,
    title: 'Report',
    text: 'Snap a photo, pin the exact location and describe what you see. Anyone can flag a hazard in moments.',
  },
  {
    id: 'analyze',
    number: '02',
    icon: ScanSearch,
    title: 'Analyze',
    text: 'HazardAtlas classifies the hazard, merges duplicate reports and scores risk so the most dangerous issues surface first.',
  },
  {
    id: 'resolve',
    number: '03',
    icon: Wrench,
    title: 'Resolve',
    text: 'Authorities work from a ranked queue, dispatch repairs and update status, so citizens can see progress.',
  },
]

export const FEATURES = [
  {
    id: 'classification',
    icon: Sparkles,
    title: 'AI-assisted classification',
    text: 'Suggests the hazard type from the photo and description, so reports arrive structured and consistent.',
  },
  {
    id: 'duplicates',
    icon: Copy,
    title: 'Duplicate detection',
    text: 'Recognises when several people report the same hazard and groups them, cutting noise and showing real impact.',
  },
  {
    id: 'risk',
    icon: Gauge,
    title: 'Risk prioritization',
    text: 'Ranks hazards by severity, type and location context, helping crews fix the riskiest problems first.',
  },
  {
    id: 'hotspots',
    icon: Flame,
    title: 'Hotspot mapping',
    text: 'Reveals streets and junctions where hazards keep recurring, turning scattered reports into maintenance priorities.',
  },
]

export const PROJECT = {
  name: 'HazardAtlas',
  description:
    'A community-powered road safety intelligence platform. Citizens report hazards; municipal teams get the insight to prioritize and fix them.',
}
