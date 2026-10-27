export {
  compareSnapshots,
  isBotChallengeTitle,
  isLoginUrl,
  type ComparableSnapshot,
  type SnapshotLink,
  type SnapshotScript,
  type ComparableElement,
} from "./compare";
export { compareScreenshots, type VisualDiffResult } from "./visual";
export { diffTextLines, describeTextDiff, TEXT_DIFF_MAX_LINES, type TextDiff } from "./text-diff";
export { comparePlatform } from "./platform";
export { isPageRedesign, siteRedesignSignal, type RedesignEvidence } from "./redesign";
export {
  compareBrokenLinks,
  isBrokenLinkStatus,
  type LinkObservation,
  type PageLinkObservations,
  type BrokenLinkSample,
  type BrokenLinksSignal,
} from "./links";
export {
  scoreChange,
  highestSeverity,
  type ScoredChange,
  type Severity,
  type ChangeSignal,
  type ChangeCategory,
  type ElementImportance,
} from "@mykavo/severity-engine";
export {
  compareSiteMeta,
  robotsBlocksAll,
  parseSitemap,
  type SiteMetaComparable,
  type ParsedSitemap,
} from "./site-meta";
export {
  changeConditionKey,
  KNOWN_CHANGE_STATUSES,
  KNOWN_PAGE_CHANGE_STATUSES,
  type ChangeConditionInput,
} from "./dedupe";
