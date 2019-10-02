import { StyleSheet } from 'react-native';
import * as defaultStyle from '../styles';
import { AgendaThemeStyle, CalendarThemeIds } from '../types';

const STYLESHEET_ID: CalendarThemeIds = 'stylesheet.calendar-list.main';

export default function getStyle(
  theme: AgendaThemeStyle | undefined = {}
) {
  const appStyle = { ...defaultStyle, ...theme };

  return StyleSheet.create({
    container: {
      backgroundColor: appStyle.calendarBackground
    },
    placeholder: {
      backgroundColor: appStyle.calendarBackground,
      alignItems: 'center',
      justifyContent: 'center'
    },
    placeholderText: {
      fontSize: 30,
      fontWeight: '200',
      color: appStyle.dayTextColor
    },
    calendar: {
      paddingLeft: 15,
      paddingRight: 15
    },
    staticHeader: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      backgroundColor: appStyle.calendarBackground,
      paddingLeft: 15,
      paddingRight: 15
    },
    ...(theme[STYLESHEET_ID] || {})
  });
}
