import { memo, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph-3d'

interface Node {
  id: string
  name: string
  val: number
  mastery: number
  layer: number
}

interface Link {
  source: string
  target: string
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

interface SkillGraphProps {
  path: 'grado' | 'autonomo'
  onNodeClick: (node: Node) => void
}

const GRAPH_DIMENSIONS = {
  width: 800,
  height: 450,
} as const

function generateGraphData(path: 'grado' | 'autonomo'): GraphData {
  const nodes: Node[] = [
    { id: 'math-core', name: 'Aritmetica', val: 5, mastery: 100, layer: 0 },
    { id: 'fractions', name: 'Fracciones', val: 3, mastery: 85, layer: 1 },
    { id: 'decimals', name: 'Decimales', val: 3, mastery: 40, layer: 1 },
    { id: 'algebra-1', name: 'Algebra Intro', val: 4, mastery: 20, layer: 2 },
    { id: 'geometry', name: 'Geometria', val: 4, mastery: 5, layer: 2 },
    { id: 'equations', name: 'Ecuaciones', val: 2, mastery: 0, layer: 3 },
  ]

  const links: Link[] = [
    { source: 'math-core', target: 'fractions' },
    { source: 'math-core', target: 'decimals' },
    { source: 'fractions', target: 'algebra-1' },
    { source: 'decimals', target: 'algebra-1' },
    { source: 'algebra-1', target: 'geometry' },
    { source: 'algebra-1', target: 'equations' },
  ]

  if (path === 'autonomo') {
    nodes.push(
      { id: 'calc-1', name: 'Calculo Intro', val: 5, mastery: 0, layer: 4 },
      { id: 'trig', name: 'Trigonometria', val: 3, mastery: 0, layer: 3 },
    )

    links.push(
      { source: 'geometry', target: 'trig' },
      { source: 'algebra-1', target: 'calc-1' },
      { source: 'trig', target: 'calc-1' },
    )
  }

  return { nodes, links }
}

function getMasteryColor(mastery: number) {
  if (mastery === 100) return '#10b981'
  if (mastery >= 50) return '#fbbf24'
  if (mastery > 0) return '#ef4444'
  return '#94a3b8'
}

function SkillGraph({ path, onNodeClick }: SkillGraphProps) {
  const graphData = useMemo(() => generateGraphData(path), [path])

  return (
    <div className="relative h-full min-h-[400px] w-full cursor-move overflow-hidden rounded-xl bg-slate-900/5">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel="name"
        nodeColor={node => getMasteryColor((node as Node).mastery)}
        nodeResolution={8}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkColor={() => '#cbd5e1'}
        backgroundColor="#00000000"
        width={GRAPH_DIMENSIONS.width}
        height={GRAPH_DIMENSIONS.height}
        cooldownTicks={60}
        onNodeClick={node => onNodeClick(node as Node)}
      />
      <div className="pointer-events-none absolute bottom-4 left-4 space-y-1 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs font-semibold shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500"></span> 100% Dominado</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400"></span> 50-99% Aprendiendo</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500"></span> &lt;50% Dificultad</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400"></span> No iniciado</div>
      </div>
    </div>
  )
}

export default memo(SkillGraph)
