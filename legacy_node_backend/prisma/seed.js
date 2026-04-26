import prisma from '../lib/prismaClient.js'
import { seedBlueprintDatabase } from './blueprintSeed.js'

async function main() {
  console.log('[seed] Iniciando seed curricular dual MathLingo')
  const summary = await seedBlueprintDatabase(prisma)
  console.log('[seed] Seed completado', summary)
}

main()
  .catch((error) => {
    console.error('[seed] Error durante el seeding:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
