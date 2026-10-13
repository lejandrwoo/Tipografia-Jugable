import { LabPanel } from './ui/labPanel.js';
import { Simulation } from './simulation/createSimulation.js';

// Inicializar UI estática
new LabPanel();

// Iniciar el Sandbox de físicas
const sim = new Simulation();
sim.startSandboxMode();