import React from 'react';
import { LEVEL_LABELS, QUESTION_LEVELS, type QuestionLevelFilter as LevelFilter } from '../../data/questionLevels';

export function QuestionLevelFilter({ value, onChange }: { value: LevelFilter; onChange: (value: LevelFilter) => void }) {
  return <label className="field level-filter"><span className="sr-only">Filter by knowledge level</span><select value={value} onChange={(event) => onChange(event.target.value as LevelFilter)}>
    <option value="all">All knowledge levels</option>
    {QUESTION_LEVELS.map((level) => <option value={level} key={level}>{LEVEL_LABELS[level]}</option>)}
    <option value="unrated">Unrated</option>
  </select></label>;
}
