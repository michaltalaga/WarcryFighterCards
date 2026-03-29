export type WarcryWeaponProfile = {
  attacks: number
  dmg_crit: number
  dmg_hit: number
  max_range: number
  min_range: number
  runemark: string
  strength: number
}

// Matches entries from data/*/*/*_fighters.json in warcry_data.
export type WarcryFighter = {
  _id: string
  name: string
  warband: string
  subfaction: string
  grand_alliance: string
  movement: number
  toughness: number
  wounds: number
  points: number
  runemarks: string[]
  weapons: WarcryWeaponProfile[]
}

export type WarcryAbility = {
  _id: string
  name: string
  warband: string
  cost: string
  description: string
  runemarks: string[]
}