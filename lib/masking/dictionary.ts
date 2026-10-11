import dict from './dictionary.json';

export type DictType = 'WEAPON' | 'OPS' | 'FACILITY';

export const DICTIONARY: Record<DictType, string[]> = {
  WEAPON: dict.WEAPON,
  OPS: dict.OPS,
  FACILITY: dict.FACILITY,
};

/** 단어 뒤에 이 글자가 붙으면 일상어로 보고 마스킹하지 않음 ("진지하게", "경계선", "작계훈련") */
export const EXCLUDE_AFTER: Record<string, string[]> = dict.EXCLUDE_AFTER;
