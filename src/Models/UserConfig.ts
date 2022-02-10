import { FoodSettings } from './FoodSettings'
import { DressingSet } from './DressingSet'
import { BeltDressingSet } from './BeltDressingSet'

export type UserConfig = {
    id: number
    hpFood: FoodSettings | null
    mpFood: FoodSettings | null
    sets: DressingSet[]
    beltSets: BeltDressingSet[]
}
