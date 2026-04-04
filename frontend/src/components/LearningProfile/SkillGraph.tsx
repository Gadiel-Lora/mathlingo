import { memo, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph-3d'

interface Node {
  id: string
  name: string
  val?: number
  mastery?: number
  state?: string
  domain?: string
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
  graphData?: GraphData
}

const GRAPH_DIMENSIONS = { width: 900, height: 480 } as const

function fallbackGraphData(path: 'grado' | 'autonomo'): GraphData {
  const nodes: Node[] = [
    { id: 'math-core', name: 'Aritmetica', val: 5, mastery: 100, state: 'mastered' },
    { id: 'fractions', name: 'Fracciones', val: 4, mastery: 85, state: 'unlocked' },
    { id: 'decimals', name: 'Decimales', val: 4, mastery: 40, state: 'unlocked' },
    { id: 'algebra-1', name: 'Algebra Intro', val: 4, mastery: 20, state: 'locked' },
  ]
  const links: Link[] = [
    { source: 'math-core', target: 'fractions' },
    { source: 'math-core', target: 'decimals' },
    { source: 'fractions', target: 'algebra-1' },
  ]
  if (path === 'autonomo') {
    nodes.push({ id: 'calc-1', name: 'Calculo Intro', val: 5, mastery: 0, state: 'locked' })
    links.push({ source: 'algebra-1', target: 'calc-1' })
  }
  return { nodes, links }
}

function nodeColor(node: Node) {
  if (node.state === 'mastered') return '#10b981'
  if (node.state === 'unlocked') return '#38bdf8'
  if ((node.mastery || 0) > 0) return '#f59e0b'
  return '#94a3b8'
}

function SkillGraph({ path, onNodeClick, graphData }: SkillGraphProps) {
  const resolvedGraph = useMemo(() => {
    if (graphData?.nodes?.length) return graphData
    return fallbackGraphData(path)
  }, [graphData, path])

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl bg-slate-950/5">
      <ForceGraph3D
        graphData={resolvedGraph}
        nodeLabel={(node) => `${(node as Node).name} • ${Math.round((node as Node).mastery || 0)}%`}
        nodeVal={(node) => (node as Node).val || 4}
        nodeColor={(node) => nodeColor(node as Node)}
        nodeResolution={8}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkColor={() => '#cbd5e1'}
        backgroundColor="#00000000"
        width={GRAPH_DIMENSIONS.width}
        height={GRAPH_DIMENSIONS.height}
        cooldownTicks={60}
        onNodeClick={(node) => onNodeClick(node as Node)}
      />
      <div className="pointer-events-none absolute bottom-4 left-4 space-y-1 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs font-semibold shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500"></span> Dominado</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-400"></span> Desbloqueado</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400"></span> En practica</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400"></span> Bloqueado</div>
      </div>
    </div>
  )
}

export default memo(SkillGraph)
