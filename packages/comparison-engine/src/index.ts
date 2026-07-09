export {
  compareSnapshots,
  type ComparableSnapshot,
  type SnapshotLink,
  type SnapshotScript,
  type ComparableElement,
} from "./compare";
export { compareScreenshots, type VisualDiffResult } from "./visual";
export {
  scoreChange,
  highestSeverity,
  type ScoredChange,
  type Severity,
  type ChangeSignal,
  type ChangeCategory,
  type ElementImportance,
} from "@fluxen/severity-engine";
