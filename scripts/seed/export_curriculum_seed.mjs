import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CURRICULUM_GRADES } from '../../curriculum/index.js'

const targetPath = resolve(process.cwd(), 'backend', 'data', 'curriculum_seed.json')
const payload = {
  grades: CURRICULUM_GRADES,
}

writeFileSync(targetPath, JSON.stringify(payload, null, 2))
console.log(`Curriculum seed exported to ${targetPath}`)
