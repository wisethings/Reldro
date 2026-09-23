import "server-only";
import { prisma } from "@/lib/prisma";
import { SIMULATION_CATALOG } from "@/lib/simulationCatalog";

/** Idempotent - safe to call on every page load. Only inserts simulations that don't already exist by title. */
export async function ensureSimulationCatalog() {
  await prisma.simulation.createMany({ data: SIMULATION_CATALOG, skipDuplicates: true });
}
