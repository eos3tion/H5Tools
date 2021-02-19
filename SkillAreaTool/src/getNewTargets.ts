import { Core } from "./Core.js";
import { PosAreaRuntime } from "./PosArea.js";

export function getNewTargets() {
    const halfGrid = Core.cfg.targetRange || 10;
    const ex = halfGrid;
    const ey = halfGrid;
    const targets = [] as PosArea[];
    for (let x = - halfGrid; x <= ex; x++) {
        for (let y = - halfGrid; y <= ey; y++) {
            targets.push(new PosAreaRuntime({ x, y }));
        }
    }
    return targets;
}