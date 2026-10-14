import { LabPanel } from './ui/labPanel.js';
import { Simulation } from './simulation/createSimulation.js';

new LabPanel();

const sim = new Simulation();
sim.startSandboxMode();