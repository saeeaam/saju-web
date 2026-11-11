import type { BranchInfo, NapeumInfo, StemInfo } from '../types/basic.ts'
import branchesJson from './branches.json'
import hiddenStemsJson from './hidden-stems.json'
import napeumJson from './napeum.json'
import relationsJson from './relations.json'
import shinsalJson from './shinsal.json'
import stemsJson from './stems.json'
import tenGodsJson from './ten-gods.json'
import twelveStagesJson from './twelve-stages.json'
import ziweiJson from './ziwei.json'

export const STEMS = stemsJson as StemInfo[]
export const BRANCHES = branchesJson as BranchInfo[]
export const NAPEUM = napeumJson.entries as NapeumInfo[]

/** 지장간. 지지 id → [여기, 중기, 정기] 천간 id */
export const HIDDEN_STEMS = hiddenStemsJson.byBranch

export const TEN_GODS = tenGodsJson.relations

export const TWELVE_STAGES = twelveStagesJson

export const SHINSAL = shinsalJson

export const ZIWEI = ziweiJson

export const RELATIONS = relationsJson
