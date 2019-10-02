import React from 'react';

export type CalendarContextValue = {
  setDisabled: (disabled: boolean) => void;
  setDate: (date: string, updateSource: string) => void;
  date: string;
  updateSource: string;
}

const CalendarContext = React.createContext({
  setDisabled: () => {},
  setDate: () => {},
  date: '',
  updateSource: ''
} as CalendarContextValue);

export default CalendarContext;
